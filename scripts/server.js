/*jshint node: true*/
/*jshint browser:true */
"use strict";

require.config({
  paths: {
    domReady: '3rd-party/domReady'
  , two: '3rd-party/two.min'
}
, shim: {
    // zepto: {
    //   exports: '$'
    // }
}
});

require(["two"], function(Two) {

  var Constants = {
    required_clients: 13
  , firebase_url: 'https://luminous-heat-1848.firebaseio.com'
  , canvas_dims: { width: 640, height: 480 }
  };

  // var rootRef = new Firebase(Constants.firebase_url);

  // Reset!
  // rootRef.set({state: {time: 0, presence: {}}});

  var Color = {
    connected_outline: 'rgb(0,0,0)'
  , connected_fill: 'rgb(0,0,0)'
  , connected_me_fill: 'rgb(155,239,255)'
  };

  var State = {
    connection_indicators: []
  , avatars: {}
  , myRole: -1
  , events: []
  , estimatedTimeOffset: null
  };

  var offsetRef = new Firebase(Constants.firebase_url + "/.info/serverTimeOffset");
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

  var make_pipe = function (x, y, owner, renderer) {
    return {
      owner: owner
    , graphics: renderer.makeRectangle(x,y,15,30)
    , duration: 1000
    , cooldown: 200
    , timeStarted: undefined
    , currState: 0
    , getNextState: function (state) {
        return state + 1;
      }
    , gotoNextState: function (fraction, fromState) {
        var lastState = this.currState;
        if (fraction < 0) {
          console.log("NEGATIVE");
        }
        if (fraction > 1) {
          this.currState = fromState + 1;
          fraction = 1;
        }
        this.graphics.rotation = fromState * Math.PI/2 +
                                 (fraction * Math.PI/2);
      }
    , snapToState: function (state) {
        this.currState = state;
        this.graphics.rotation = state * Math.PI/2;
      }
    };
  };

  var elem = document.getElementById('draw-shapes');
  var params = Constants.canvas_dims;
  var two = new Two(params).appendTo(elem);


  var eventRef = new Firebase(Constants.firebase_url + "/events/");
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
  eventRef.on("value", function (snap) {
    var currTime = estimateCurrentTime();
    State.events = [];
    snap.forEach(function (child) {
      var endTime = child.val().startTime + child.val().duration;
      if (currTime > endTime) {
        var avatarIndex = child.val().avatarIndex;
        var fromState = child.val().fromState;
        var canonicalIndexRef = new Firebase(Constants.firebase_url + "/canonical/" + avatarIndex);
        if (State.avatars.hasOwnProperty(avatarIndex)) {
          canonicalIndexRef.set({state: State.avatars[avatarIndex].getNextState(fromState)});
        }
        child.ref().remove();
      } else {
        State.events.push(child.val());
      }
    });
  });

  var canonicalRef = new Firebase(Constants.firebase_url + "/canonical/");
  canonicalRef.once('value', function (snap) {
    snap.forEach(function (child) {
      var index = child.name();
      var state = child.val().state;
      if (State.avatars.hasOwnProperty(index)) {
        State.avatars[index].snapToState(state);
      }
    });
  });

  // eventRef.on("child_added", function (childSnap) {
  //   State.events.push(childSnap.val());
  // });

  State.avatars[1] = make_pipe(100, 100, 1, two);
  State.avatars[3] = make_pipe(300, 100, 1, two);

  for (var i = 0; i < Constants.required_clients; i++) {
    var side_length = 10;
    var offset = 2;
    var spacing = 3;
    var rect = two.makeRectangle(offset + (side_length + spacing) * (i + 1)
     , offset + side_length/2
     , side_length
     , side_length);
    rect.stroke = Color.connected_outline;
    rect.noFill();
    State.connection_indicators.push(rect);
  }

  var listRef = new Firebase(Constants.firebase_url + "/presence/");
  var userRef = listRef.push();

  // Add ourselves to presence list when online.
  var presenceRef = new Firebase(Constants.firebase_url + "/.info/connected");
  presenceRef.on("value", function(snap) {
    if (snap.val()) {
      // console.log(userRef.name());
      userRef.set(-1);
      listRef.once("value", function(snap) {
        var filled = [];
        var requiredPositions = [];
        for (var i = Constants.required_clients - 1; i >= 0; i--) {
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
      });
      // Remove ourselves when we disconnect.
      userRef.onDisconnect().remove();
    }
  });

  // Number of online users is the number of objects in the presence list.
  listRef.on("value", function(snap) {
    for (var i = 0; i < State.connection_indicators.length; i++) {
      State.connection_indicators[i].noFill();
    }
    snap.forEach (function (child) {
      var index = child.val();
      if (index > -1) {
        if (index === State.myRole) {
                State.connection_indicators[index].fill = Color.connected_me_fill;
        } else {
          State.connection_indicators[index].fill = Color.connected_fill;
        }
      }
    });
    // console.log("# of online users = " + snap.numChildren());
  });

  // rootRef.once('value', function (snapshot) {
  //   var d = snapshot.val();

  //   var dataRef = new Firebase(Constants.firebase_url + "/state");
  //   dataRef.update({total_connections: d.state.total_connections + 1});
  //   console.log(d.state.total_connections);
  // });

  // rect.fill = 'rgb(0, 200, 255)';
  // Don't forget to tell two to render everything
  // to the screen

  two.bind('update', function(frameCount, deltaTime) {
    var currTime = estimateCurrentTime();
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
    // group.rotation =
    // This code is called everytime two.update() is called.
    // Effectively 60 times per second.
    // console.log(delt);
  }).play();  // Start the animation loop
});