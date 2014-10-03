define(['two', 'color', 'constants', 'avatar_maker'], function(Two, Color, Constants, AvatarMaker) {

  var State = {
    connectionIndicators: []
  , avatars: {}
  , myRole: -1
  , events: []
  , estimatedTimeOffset: null
  , grid: {}
  , ball: null
  };

  // var rootRef = new Firebase(Constants.firebaseUrl);
  // Reset!
  // rootRef.set({state: {time: 0}, presence: {}, canonical: []});

  var offsetRef = new Firebase(Constants.firebaseUrl + '/.info/serverTimeOffset');
  offsetRef.on("value", function(snap) {
    State.estimatedTimeOffset = snap.val();
  });
  var estimateCurrentTime = function () {
    if (State.estimatedTimeOffset === null) {
      return new Date().getTime();
    } else {
      return new Date().getTime() + State.estimatedTimeOffset;
    }
  }

  var G = {
    init: function () {
      var _g = this;
      var elem = document.getElementById('draw-shapes');
      var params = Constants.canvasDims;
      var renderer = new Two(params).appendTo(elem);

      this.add_avatars(renderer);
      this.make_connection_visualizer(renderer);

      this.connect_events(elem);

      this.setup_presence(function () {
        _g.load_state(_g.setup_main_loop.bind(_g,renderer));
      });

    }
  , add_avatars: function (renderer) {
      var gridSquareSide = 30;
      var add_pipe = function (owner, maker, pos) {
        var x = pos.x? pos.x : 0
          , y = pos.y? pos.y : 0
          , width = 15
          , height = 30
          , avatar = maker(owner, renderer
                          , { x: x * gridSquareSide
                          , y: y * gridSquareSide
                          , width: width
                          , height: height
                          });
        if (owner != Constants.noOwner) {
          State.avatars[owner] = avatar;
        }
        if (!State.grid.hasOwnProperty(x)) {
          State.grid[x] = {};
        }
        State.grid[x][y] = avatar;
      }

      State.ball = AvatarMaker.make_ball(Constants.noOwner
                                        , renderer, { x: 2 * gridSquareSide
                                        , y: 7 * gridSquareSide
                                        , radius: 5
                                        });

      var straightMaker = AvatarMaker.make_straight_pipe;
      var rhMaker = AvatarMaker.make_rh_pipe;
      add_pipe(1, straightMaker, {x: 1, y: 2});
      add_pipe(2, rhMaker, {x: 2, y: 2});
      add_pipe(3, straightMaker, {x: 3, y: 2});

      add_pipe(Constants.noOwner, straightMaker, {x: 2, y: 3});
      add_pipe(Constants.noOwner, straightMaker, {x: 2, y: 4});
      add_pipe(Constants.noOwner, straightMaker, {x: 2, y: 5});
      add_pipe(Constants.noOwner, straightMaker, {x: 2, y: 6});
    }
  , make_connection_visualizer: function (renderer) {
      for (var i = 0; i < Constants.requiredClients; i++) {
        var sideLength = 10;
        var offset = 2;
        var spacing = 3;
        var rect = renderer.makeRectangle(offset + (sideLength + spacing) * (i + 1)
         , offset + sideLength/2
         , sideLength
         , sideLength);
        rect.stroke = Color.connectedOutline;
        rect.noFill();
        State.connectionIndicators.push(rect);
      }
    }
  , connect_events: function (elem) {
      var eventRef = new Firebase(Constants.firebaseUrl + '/events/');
      elem.onclick = function () {
        if (State.avatars.hasOwnProperty(State.myRole)) {
          var cooldown = State.avatars[State.myRole].cooldown;
          var duration = State.avatars[State.myRole].duration;
          var currTime = estimateCurrentTime();
          if (State.avatars[State.myRole].timeStarted === undefined ||
              State.avatars[State.myRole].timeStarted + duration + cooldown < estimateCurrentTime()) {
            State.avatars[State.myRole].timeStarted = currTime;
            eventRef.push({ avatarIndex: State.myRole
                          , startTime: Firebase.ServerValue.TIMESTAMP
                          , duration: duration
                          , fromState: State.avatars[State.myRole].currState
                          });
          }
        }
      };

      eventRef.on('value', function (snap) {
        var currTime = estimateCurrentTime();
        State.events = [];
        snap.forEach(function (child) {
          var endTime = child.val().startTime + child.val().duration;
          if (currTime > endTime) {
            var avatarIndex = child.val().avatarIndex;
            var fromState = child.val().fromState;
            var canonicalIndexRef = new Firebase(Constants.firebaseUrl + '/canonical/' + avatarIndex);
            if (State.avatars.hasOwnProperty(avatarIndex)) {
              canonicalIndexRef.set({state: State.avatars[avatarIndex].getNextState(fromState)});
            }
            child.ref().remove();
          } else {
            State.events.push(child.val());
          }
        });
      });
    }
  , load_state: function (cb) {
      var canonicalRef = new Firebase(Constants.firebaseUrl + '/canonical/');
      canonicalRef.once('value', function (snap) {
        snap.forEach(function (child) {
          var index = child.name();
          var state = child.val().state;
          if (State.avatars.hasOwnProperty(index)) {
            State.avatars[index].snapToState(state);
          }
        });
        cb();
      });
    }
  , setup_main_loop: function (renderer) {
      renderer.bind('update', this.update).play(); // Start the animation loop
    }
  , update: function (frameCount, deltaTime) {
      var currTime = estimateCurrentTime();
      State.ball.simulate(currTime);
      for (var i = State.events.length - 1; i >= 0; i--) {
        var currEvent = State.events[i];
        var avatarIndex = currEvent.avatarIndex;
        var startTime = currEvent.startTime;
        var duration = currEvent.duration;
        var fromState = currEvent.fromState;
        var elapsed = currTime - startTime;
        if (State.avatars.hasOwnProperty(avatarIndex)) {
          var fractionComplete = elapsed/duration;
          State.avatars[avatarIndex].gotoNextState(fractionComplete, fromState);
        }
      }
    }
  , setup_presence: function (cb) {
      var listRef = new Firebase(Constants.firebaseUrl + '/presence/');
      var userRef = listRef.push();

      // Add ourselves to presence list when online.
      var presenceRef = new Firebase(Constants.firebaseUrl + '/.info/connected');
      presenceRef.on('value', function(snap) {
        if (snap.val()) {
          // console.log(userRef.name());
          userRef.set(-1);
          listRef.once('value', function(snap) {
            var filled = [];
            var requiredPositions = [];
            for (var i = Constants.requiredClients - 1; i >= 0; i--) {
              requiredPositions.push(i);
            }
            snap.forEach(function (child) {
              if (child.val() > -1) {
                filled.push(child.val());
              }
            });
            requiredPositions = requiredPositions.filter(function (el) {
              return filled.indexOf(el) === -1;
            });
            State.myRole = requiredPositions.pop();
            userRef.set(State.myRole);
            cb();
          });
          // Remove ourselves when we disconnect.
          userRef.onDisconnect().remove();
        }
      });

      // Number of online users is the number of objects in the presence list.
      listRef.on('value', function(snap) {
        for (var i = 0; i < State.connectionIndicators.length; i++) {
          State.connectionIndicators[i].noFill();
        }
        snap.forEach (function (child) {
          var index = child.val();
          if (index > -1) {
            State.connectionIndicators[index].fill = Color.connectedFill;
            if (index === State.myRole) {
              State.connectionIndicators[index].noStroke()
            } else {
              State.connectionIndicators[index].stroke = Color.connectedOutline;
            }
          }
        });
        // console.log("# of online users = " + snap.numChildren());
      });
    }
  };

  return G;
});