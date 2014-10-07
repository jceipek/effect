define(['jquery', 'two', 'color', 'constants', 'avatar_maker'], function($, Two, Color, Constants, AvatarMaker) {

  var State = {
    connectionIndicators: []
  , avatars: {}
  , myRole: -1
  , events: []
  , estimatedTimeOffset: null
  , grid: {}
  , environment: {}
  , environmentOwner: Constants.noOwner
  , processedTitleEvents: {}
  , firebaseReferences: []
  , rendererRef: null // XXX: CRUDE HACK TO DISABLE PLAYING
  };

  window._inspect_state = State;

  // XXX: TODO: Remove me
  window._reset_effect = function () {
    var rootRef = new Firebase(Constants.firebaseUrl);
    rootRef.set({state: {time: 0}, presence: {}, canonical: [], environmentOwner: Constants.noOwner});
  }

  var offsetRef = new Firebase(Constants.firebaseUrl + '/.info/serverTimeOffset');
  State.firebaseReferences.push(offsetRef);
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

  var is_observer = function () {
    return (location.search !== '');
  }

  var makeFullscreen = function (element) {
    if(element.requestFullscreen) {
      element.requestFullscreen();
    } else if(element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if(element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if(element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  var G = {
    init: function () {
      $(document).one('click', function() {
        makeFullscreen(document.documentElement);
      });

      var _g = this;
      this.connect_votes.call(_g);
      var elem = $('.js-effect')[0];
      $('.js-word-transition').addClass('hidden');
      var renderer = new Two(Constants.canvasDims).appendTo(elem);

      this.add_avatars(renderer);
      this.make_connection_visualizer(renderer);

      var eventRef = new Firebase(Constants.firebaseUrl + '/events/');
      State.firebaseReferences.push(eventRef);
      this.setup_input($(document), eventRef);

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
      };

      var add_action_tile = function (maker, pos) {
        var x = pos.x? pos.x : 0
          , y = pos.y? pos.y : 0;
        if (!State.grid.hasOwnProperty(x)) {
          State.grid[x] = {};
        }
        State.grid[x][y] = maker();
      };

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

      add_action_tile(AvatarMaker.make_ouroboros_tile, {x: 1, y: 9});
      add_action_tile(AvatarMaker.make_crash_tile, {x: 5, y: 0});

      add_action_tile(AvatarMaker.make_crash_tile, {x: 9, y: 7}); // XXX: REMOVE ME (USED FOR DEBUGGING)

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
      elem.click(function () {
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
      });
    }
  , setup_event_processing: function (eventRef) {
      var _g = this;
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
              case 'title':
                // Processed earlier
                delete State.processedTitleEvents[child.val().startTime]; // To free space
                break;
              case 'crash':
                // Processed earlier
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
              case 'title':
                // NOTE: Pretty sure the env owner is showing the titlecard twice
                var identifier = child.val().identifier;
                var text = child.val().fromState;
                var startTime = child.val().startTime;
                var duration = child.val().duration;
                if (State.processedTitleEvents[startTime] === undefined) {
                  State.processedTitleEvents[startTime] = true;
                  _g.flash_titlecard(text, duration);
                }
              break;
              case 'crash':
                if (location.search !== '') {
                  $('.js-effect').addClass('invisible');
                  _g.flash_titlecard('Payload Delivery Pending...', 5000);
                } else {
                  _g.simulate_console.call(_g);
                }
              break;
              default:
                console.error('Cannot process event ' + eventType);
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
      State.firebaseReferences.push(canonicalRef);
      State.firebaseReferences.push(canonicalEnvironmentRef);
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
  , stop_listening_to_main_events: function () {
      for (var i = 0; i < State.firebaseReferences.length; i++) {
        State.firebaseReferences[i].off();
      }
      State.firebaseReferences = [];
    }
  , disconnect: function () {
      Firebase.goOffline();
    }
  , simulate_kernel_panic: function () {
      var _g = this;
      _g.disconnect();
      $('.js-effect').addClass('invisible');
      $('.js-panic').removeClass('invisible');
      setTimeout(function () {
        $('.js-panic').addClass('invisible');
        _g.flash_titlecard('affect', 5000);
      }, 30000);
    }
  , connect_votes: function () {
      var _g = this;
      var fakeConsoleVotes = $('.js-console-votes');
      var votesRef = new Firebase(Constants.firebaseUrl + '/voteCount');
      var fakeConsoleContent = $('.js-console-content');
      votesRef.on('value', function (snap) {
        var forCount = 0;
        var againstCount = 0;
        snap.forEach(function (child) {
          if (child.val()) {
            forCount += 1;
          } else {
            againstCount += 1;
          }
        });
        fakeConsoleVotes.text('Proceed? '+forCount+' for, '+againstCount+' against.')
        if (forCount + againstCount >= Constants.requiredClients) {
          if (forCount > againstCount) {
            fakeConsoleContent.text(fakeConsoleContent.text() + '\n\nAttack Authorized.');
            if (location.search !== '') {
              _g.simulate_kernel_panic.call(_g);
            }
          } else {
            fakeConsoleContent.text(fakeConsoleContent.text() + '\n\nAttack Aborted.');
          }
        }
      });
    }
  , simulate_console: function () {
      var _g = this;
      State.rendererRef.unbind('update'); // XXX: HACK TO DISABLE PLAYING
      _g.stop_listening_to_main_events();
      var count = 0;
      $('.js-effect').addClass('invisible');
      var fakeConsole = $('.js-console');
      var fakeConsoleVotes = $('.js-console-votes');
      var fakeConsoleContent = $('.js-console-content');
      fakeConsole.removeClass('invisible');
      fakeConsoleContent.text("# env X='() { (a)=>\\' sh -c \"echo exec EFFECT\"; cat echo \n\n Uploading Payload\n\n");
      var votesRef = new Firebase(Constants.firebaseUrl + '/voteCount');
      var timer = setInterval(function () {
        fakeConsoleContent.text(fakeConsoleContent.text() + '.');
        count++;
        if (count >= 500) {
          fakeConsoleContent.text(fakeConsoleContent.text() + '\nCompleted. Proceed? y/n');
          clearInterval(timer);
          $(window).keypress(function(e) {
              var key = e.which;
              console.log(e.which);
              if (key === 121) { // Y
                fakeConsoleContent.text(fakeConsoleContent.text() + '\n\n y');
                console.log("PROCEED");
                votesRef.push(true);
                fakeConsoleVotes.removeClass('invisible');
                $(window).unbind('keypress');
              } else if (key === 110) { // N
                fakeConsoleContent.text(fakeConsoleContent.text() + '\n\n n');
                console.log("ABORT");
                votesRef.push(false);
                fakeConsoleVotes.removeClass('invisible');
                $(window).unbind('keypress');
              }
          });
        }
      }, 20);
    }
  , setup_main_loop: function (renderer, eventRef) {
      State.rendererRef = renderer;
      renderer.bind('update', this.make_update.call(this,eventRef)).play(); // Start the animation loop
    }
  , reset_ball: function (currTime) {
      State.environment.ball.reset_pos(currTime);
      this.flash_titlecard('passive');
    }
  , flash_titlecard: function (word, duration) {
      duration = duration ? duration : 1000;
      $('.js-word-content').text(word);
      $('.js-word-transition').removeClass('hidden');
      setTimeout(function () {
        $('.js-word-transition').addClass('hidden');
      }, duration);
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
            if (State.myRole !== State.environmentOwner) {
              State.environment[identifier].snap_to_state(fromState, startTime);
            }
          }
        }

        // The environment simulation isn't quite event driven. Rather, when events fire,
        // they change the state of the environment objects, which may make them change how they move
        for (var identifier in State.environment) {
          if (State.environment.hasOwnProperty(identifier)) {
            if (State.myRole != Constants.noOwner && State.myRole === State.environmentOwner) {
              var resetReason = State.environment[identifier].should_reset(State.grid);
              if (resetReason !== false) {
                console.log("RESET!");
                _g.reset_ball(currTime);
                console.log("RESET EVENT");
                eventRef.push({ type: 'environment'
                  , identifier: identifier
                  , startTime: currTime//Firebase.ServerValue.TIMESTAMP
                  , duration: 10
                  , fromState: State.environment[identifier].currState
                  });
                var message = 'passive';
                var titleCardDuration = 1000;
                if (resetReason === Constants.resetReason.ouroboros) {
                  message = 'ouroboros';
                  titleCardDuration = 30000;
                } else if (resetReason === Constants.resetReason.crash) {
                  message = 'payload delivered...';
                  titleCardDuration = 0;
                  eventRef.push({ type: 'crash'
                    , identifier: 'console'
                    , duration: 5000
                    , startTime: Firebase.ServerValue.TIMESTAMP
                    });
                } else if (resetReason === Constants.resetReason.hitWall) {
                  message = 'impasse';
                } else if (resetReason === Constants.resetReason.escapedSpace) {
                  message = 'freedom?';
                  titleCardDuration = 3000;
                }
                if (titleCardDuration > 0) {
                  eventRef.push({ type: 'title'
                    , identifier: 'reset'
                    , startTime: Firebase.ServerValue.TIMESTAMP
                    , duration: titleCardDuration
                    , fromState: message
                    });
                }
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
      State.firebaseReferences.push(environmentOwnerRef);
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
            if (!is_observer()) {
              State.myRole = requiredPositions.pop();
              userRef.set(State.myRole);
            } else {
              State.myRole = Constants.noOwner;
            }

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

  window.simulate_console = G.simulate_console;
  window.$ = $;

  return G;
});