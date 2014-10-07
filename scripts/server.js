define(['two', 'color', 'constants', 'avatar_maker'], function(Two, Color, Constants, AvatarMaker) {

  var State = {
    connectionIndicators: []
  , avatars: {}
  , myRole: -1
  , events: []
  , estimatedTimeOffset: null
  , grid: {}
  , environment: {}
  , environmentOwner: Constants.noOwner
  };

  window._inspect_state = State;

  // XXX: TODO: Remove me
  window._reset_effect = function () {
    var rootRef = new Firebase(Constants.firebaseUrl);
    rootRef.set({state: {time: 0}, presence: {}, canonical: [], environmentOwner: Constants.noOwner});
  }

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
      var elem = document.getElementById('effect');
      var renderer = new Two(Constants.canvasDims).appendTo(elem);

      this.add_avatars(renderer);
      this.make_connection_visualizer(renderer);

      var eventRef = new Firebase(Constants.firebaseUrl + '/events/');
      this.setup_input(elem, eventRef);

      _g.setup_presence(function () {
        _g.load_state.call(_g, function () {
          _g.setup_main_loop.call(_g, renderer, eventRef);
          _g.setup_environment_owner.call(_g, eventRef);
          _g.setup_event_processing.call(_g, eventRef);
        });
      });

    }
  , add_avatars: function (renderer) {
      var gridSquareSide = Constants.gridSquareSide;
      var add_pipe = function (owner, maker, pos, initState) {
        var x = pos.x? pos.x : 0
          , y = pos.y? pos.y : 0
          , width = Constants.pipeWidth
          , height = Constants.pipeHeight
          , avatar = maker(owner, renderer
                          , { x: x * gridSquareSide - gridSquareSide/2
                          , y: y * gridSquareSide - gridSquareSide/2
                          , width: width
                          , height: height
                          }, initState);
        if (owner != Constants.noOwner) {
          State.avatars[owner] = avatar;
        }
        if (!State.grid.hasOwnProperty(x)) {
          State.grid[x] = {};
        }
        State.grid[x][y] = avatar;
      }

      State.environment.ball = AvatarMaker.make_ball( Constants.noOwner
                                                    , renderer, { x: 1 * gridSquareSide - gridSquareSide/2
                                                    , y: 8 * gridSquareSide - gridSquareSide/2
                                                    , radius: 8
                                                    });

      var straightMaker = AvatarMaker.make_straight_pipe;
      var rhMaker = AvatarMaker.make_rh_pipe;
      add_pipe(Constants.noOwner, rhMaker, {x: 1, y: 1}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 2, y: 1}, 1);
      add_pipe(Constants.noOwner, rhMaker, {x: 3, y: 1}, 1);

      add_pipe(0, rhMaker, {x: 5, y: 1}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 6, y: 1}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 7, y: 1}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 8, y: 1}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 9, y: 1}, 1);
      add_pipe(Constants.noOwner, rhMaker, {x: 10, y: 1}, 1);

      add_pipe(Constants.noOwner, rhMaker, {x: 1, y: 2}, 3);
      add_pipe(Constants.noOwner, rhMaker, {x: 2, y: 2}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 3, y: 2}, 0);
      add_pipe(Constants.noOwner, rhMaker, {x: 5, y: 2}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 6, y: 2}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 7, y: 2}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 8, y: 2}, 1);
      add_pipe(Constants.noOwner, rhMaker, {x: 9, y: 2}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 10, y: 2}, 0);

      add_pipe(Constants.noOwner, rhMaker, {x: 1, y: 3}, 0);
      add_pipe(1, rhMaker, {x: 2, y: 3}, 2);
      add_pipe(2, rhMaker, {x: 3, y: 3}, 3);
      add_pipe(Constants.noOwner, rhMaker, {x: 4, y: 3}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 5, y: 3}, 0);
      add_pipe(3, rhMaker, {x: 6, y: 3}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 7, y: 3}, 1);
      add_pipe(Constants.noOwner, rhMaker, {x: 8, y: 3}, 1);
      add_pipe(4, rhMaker, {x: 9, y: 3}, 3);
      add_pipe(Constants.noOwner, rhMaker, {x: 10, y: 3}, 2);

      add_pipe(Constants.noOwner, straightMaker, {x: 1, y: 4}, 0);
      add_pipe(5, rhMaker, {x: 2, y: 4}, 0);
      add_pipe(Constants.noOwner, rhMaker, {x: 3, y: 4}, 1);
      add_pipe(6, rhMaker, {x: 4, y: 4}, 3);
      add_pipe(7, rhMaker, {x: 5, y: 4}, 2);
      add_pipe(Constants.noOwner, straightMaker, {x: 6, y: 4}, 0);
      add_pipe(Constants.noOwner, rhMaker, {x: 8, y: 4}, 3);
      add_pipe(Constants.noOwner, rhMaker, {x: 9, y: 4}, 1);

      add_pipe(Constants.noOwner, rhMaker, {x: 1, y: 5}, 3);
      add_pipe(Constants.noOwner, rhMaker, {x: 2, y: 5}, 2);
      add_pipe(8, rhMaker, {x: 3, y: 5}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 4, y: 5}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 5, y: 5}, 1);
      add_pipe(9, rhMaker, {x: 6, y: 5}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 7, y: 5}, 1);
      add_pipe(10, rhMaker, {x: 8, y: 5}, 1);
      add_pipe(Constants.noOwner, rhMaker, {x: 9, y: 5}, 2);

      add_pipe(Constants.noOwner, straightMaker, {x: 1, y: 6}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 2, y: 6}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 3, y: 6}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 4, y: 6}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 5, y: 6}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 6, y: 6}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 7, y: 6}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 8, y: 6}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 9, y: 6}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 10, y: 6}, 0);

      add_pipe(Constants.noOwner, rhMaker, {x: 1, y: 7}, 0);
      add_pipe(Constants.noOwner, straightMaker, {x: 2, y: 7}, 1);
      add_pipe(11, rhMaker, {x: 3, y: 7}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 4, y: 7}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 5, y: 7}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 6, y: 7}, 1);
      add_pipe(12, rhMaker, {x: 7, y: 7}, 0);
      add_pipe(13, straightMaker, {x: 8, y: 7}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 9, y: 7}, 1);
      add_pipe(Constants.noOwner, rhMaker, {x: 10, y: 7}, 1);

      add_pipe(Constants.noOwner, straightMaker, {x: 1, y: 8}, 0);
      add_pipe(Constants.noOwner, rhMaker, {x: 3, y: 8}, 3);
      add_pipe(Constants.noOwner, straightMaker, {x: 4, y: 8}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 5, y: 8}, 1);
      add_pipe(Constants.noOwner, straightMaker, {x: 6, y: 8}, 1);
      add_pipe(Constants.noOwner, rhMaker, {x: 7, y: 8}, 2);
      add_pipe(Constants.noOwner, rhMaker, {x: 8, y: 8}, 3);
      add_pipe(Constants.noOwner, straightMaker, {x: 9, y: 8}, 1);
      add_pipe(Constants.noOwner, rhMaker, {x: 10, y: 8}, 2);
      // add_pipe(2, rhMaker, {x: 3, y: 2});
      // add_pipe(3, straightMaker, {x: 4, y: 2});

      //// add_pipe(Constants.noOwner, straightMaker, {x: 3, y: 3});
      // add_pipe(Constants.noOwner, straightMaker, {x: 3, y: 4});
      //// add_pipe(Constants.noOwner, straightMaker, {x: 3, y: 5});
      // add_pipe(Constants.noOwner, straightMaker, {x: 3, y: 6});
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
  , setup_input: function (elem, eventRef) {
      elem.onclick = function () {
        if (State.avatars.hasOwnProperty(State.myRole)) {
          var currTime = estimateCurrentTime();
          var cooldown = State.avatars[State.myRole].cooldown;
          var duration = State.avatars[State.myRole].duration;
          if (State.avatars[State.myRole].timeStarted === undefined ||
              State.avatars[State.myRole].timeStarted + duration + cooldown < estimateCurrentTime()) {
            State.avatars[State.myRole].timeStarted = currTime;
            eventRef.push({ type: 'avatar'
                          , avatarIndex: State.myRole
                          , startTime: Firebase.ServerValue.TIMESTAMP
                          , duration: duration
                          , fromState: State.avatars[State.myRole].currState
                          });
          }
        }
      };
    }
  , setup_event_processing: function (eventRef) {
      eventRef.on('value', function (snap) {
        var currTime = estimateCurrentTime();
        State.events = [];
        var mostRecentAvatarEvents = {};
        var mostRecentEnvironmentEvents = {};
        snap.forEach(function (child) {
          var endTime = child.val().startTime + child.val().duration;
          var eventType = child.val().type;

          if (currTime > endTime) {
            var canonicalIndexRef;

            switch (eventType) {
              case 'avatar':
                var avatarIndex = child.val().avatarIndex
                  , fromState = child.val().fromState;
                if (State.avatars.hasOwnProperty(avatarIndex)) {
                  canonicalIndexRef = new Firebase(Constants.firebaseUrl + '/canonical/' + avatarIndex);
                  canonicalIndexRef.set({state: State.avatars[avatarIndex].getNextState(fromState), atTime: currTime});
                }
                break;
              case 'environment':
                // var identifier = child.val().identifier;
                // canonicalIndexRef = new Firebase(Constants.firebaseUrl + '/canonicalEnvironment/' + identifier);
                // var startTime = State.environment[identifier].startTime;
                // console.log(State.environment[identifier]);
                // console.log("TRYING TO SEND: "+startTime);
                // canonicalIndexRef.set({state: State.environment[identifier].currState, atTime: startTime});
                break;
              default:
                console.error('Cannot process event ' + eventType);
            }
            child.ref().remove();
          } else {
            switch (eventType) {
              case 'avatar':
                var avatarIndex = child.val().avatarIndex;
                if (!mostRecentAvatarEvents.hasOwnProperty(avatarIndex) ||
                    mostRecentAvatarEvents[avatarIndex].startTime < child.val().startTime) {
                  mostRecentAvatarEvents[avatarIndex] = child.val();
                }
              break;
              case 'environment':
                var identifier = child.val().identifier;
                if (!mostRecentEnvironmentEvents.hasOwnProperty(identifier) ||
                    mostRecentEnvironmentEvents[identifier].startTime < child.val().startTime) {
                  mostRecentEnvironmentEvents[identifier] = child.val();
                }
              break;
            }
            for (var avatarEvent in mostRecentAvatarEvents) {
              if (mostRecentAvatarEvents.hasOwnProperty(avatarEvent)) {
                State.events.push(mostRecentAvatarEvents[avatarEvent]);
              }
            }
            for (var environmentEvent in mostRecentEnvironmentEvents) {
              if (mostRecentEnvironmentEvents.hasOwnProperty(environmentEvent)) {
                State.events.push(mostRecentEnvironmentEvents[environmentEvent]);
              }
            }
          }
        });

      });
    }
  , load_state: function (cb) {
      var canonicalRef = new Firebase(Constants.firebaseUrl + '/canonical/');
      var canonicalEnvironmentRef = new Firebase(Constants.firebaseUrl + '/canonicalEnvironment/');
      canonicalRef.once('value', function (snap) {
        snap.forEach(function (child) {
          var index = child.name();
          var state = child.val().state;
          if (State.avatars.hasOwnProperty(index)) {
            State.avatars[index].snap_to_state(state);
          }
        });
        canonicalEnvironmentRef.once('value', function (snap) {
          snap.forEach(function (child) {
            var currTime = estimateCurrentTime();
            var identifier = child.name();
            var state = child.val().state;
            switch (identifier) {
              case 'ball':
                State.environment[identifier].snap_to_state(state, currTime);
                break;
              default:
                console.error('Cannot load state for ' + identifier);
            }
          });
          cb();
        });
      });
    }
  , setup_main_loop: function (renderer, eventRef) {
      renderer.bind('update', this.make_update.call(this,eventRef)).play(); // Start the animation loop
    }
  , reset_ball: function (currTime) {
      State.environment.ball.reset_pos(currTime);
    }
  , make_update: function (eventRef) {
      var _g = this;
      return function (frameCount, deltaTime) {
        var currTime = estimateCurrentTime();
        for (var i = State.events.length - 1; i >= 0; i--) {
          var currEvent = State.events[i];
          var type = currEvent.type;
          var identifier = currEvent.identifier;
          var avatarIndex = currEvent.avatarIndex;
          var startTime = currEvent.startTime;
          var duration = currEvent.duration;
          var fromState = currEvent.fromState;
          var elapsed = currTime - startTime;
          var fractionComplete = elapsed/duration;
          if (type === 'avatar' && State.avatars.hasOwnProperty(avatarIndex)) {
            State.avatars[avatarIndex].gotoNextState(fractionComplete, fromState);
          }
          if (type === 'environment') {
            if (State.myRole !== Constants.noOwner && State.myRole !== State.environmentOwner) {
              State.environment[identifier].snap_to_state(fromState, startTime);
            }
          }
        }

        // The environment simulation isn't quite event driven. Rather, when events fire,
        // they change the state of the environment objects, which may make them change how they move
        for (var identifier in State.environment) {
          if (State.environment.hasOwnProperty(identifier)) {
            if (State.myRole != Constants.noOwner && State.myRole === State.environmentOwner) {
              if (State.environment[identifier].should_reset(State.grid)) {
                console.log("RESET!");
                _g.reset_ball(currTime);
                console.log("RESET EVENT");
                eventRef.push({ type: 'environment'
                  , identifier: identifier
                  , startTime: currTime//Firebase.ServerValue.TIMESTAMP
                  , duration: 10
                  , fromState: State.environment[identifier].currState
                  });
                  continue; // So we don't simulate another time
              } else if (State.environment[identifier].change_state_if_necessary(currTime, State.grid)) {
                eventRef.push({ type: 'environment'
                  , identifier: identifier
                  , startTime: Firebase.ServerValue.TIMESTAMP
                  , duration: 10
                  , fromState: State.environment[identifier].currState
                  });
                  continue; // So we don't simulate another time
              }
            }
            State.environment[identifier].simulate(currTime);
          }
        }
      }
    }
  , init_environment_simulation: function (eventRef) {
      var currTime = estimateCurrentTime();
      // Send event to start ball moving!
      var duration = 10; // Use as arbitrary sync signal?
      State.environment.ball.startTime = currTime;
      console.log("INIT ENV FROM ");
      console.log(State.environment.ball.currState.x + " " + State.environment.ball.currState.y);
      eventRef.push({ type: 'environment'
                    , identifier: 'ball'
                    , startTime: Firebase.ServerValue.TIMESTAMP
                    , duration: duration
                    , fromState: State.environment.ball.currState
                    });
    }
  , setup_environment_owner: function (eventRef) {
      var _g = this;
      // Ensure that there is always a unique environment owner
      // as long as one person is connected, and that
      // the owner is stored in State.environmentOwner
      var environmentOwnerRef = new Firebase(Constants.firebaseUrl + '/environmentOwner');
      environmentOwnerRef.on('value', function (snap) {
        var currOwner = snap.val();
        if (currOwner === Constants.noOwner) {
          environmentOwnerRef.set(State.myRole);
          State.environmentOwner = State.myRole;
          console.log("I own the environment!");
          _g.init_environment_simulation(eventRef);
          environmentOwnerRef.onDisconnect().set(Constants.noOwner);
        } else {
          State.environmentOwner = currOwner;
        }
      });
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