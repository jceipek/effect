define(['color', 'constants'], function(Color, Constants) {
  var make_straight_pipe_graphics = function (renderer, dims) {
    var x = dims.x? dims.x : 0;
    var y = dims.y? dims.y : 0;
    var width = dims.width? dims.width : 15;
    var height = dims.height? dims.height : 30;

    var leftBar = renderer.makeRectangle(1.5/15 * width - width/2,0,3/15 * width,height);
    leftBar.fill = Color.pipeRails;
    leftBar.noStroke();
    var rightBar = renderer.makeRectangle(13.5/15 * width - width/2,0,3/15 * width,height);
    rightBar.fill = Color.pipeRails;
    rightBar.noStroke();
    // var topBar = renderer.makeRectangle(0,-height/2 + (7/30 * height)/2 + (2/30 * height),width,7/30 * height);
    // topBar.fill = Color.pipeCrossbars;
    // topBar.noStroke();
    // var midBar = renderer.makeRectangle(0,0,width,6/30 * height);
    // midBar.fill = Color.pipeCrossbars;
    // midBar.noStroke();
    // var bottomBar = renderer.makeRectangle(0,-height/2 + 21/30 * height + (7/30 * height)/2,width,7/30 * height);
    // bottomBar.fill = Color.pipeCrossbars;
    // bottomBar.noStroke();
    var group = renderer.makeGroup(leftBar, rightBar);//, midBar, topBar, bottomBar);
    group.translation.set(x,y);
    return group;
  };

  var make_rh_pipe_graphics = function (renderer, dims) {
    var x = dims.x? dims.x : 0;
    var y = dims.y? dims.y : 0;
    var width = dims.width? dims.width : 15;
    var height = dims.height? dims.height : 30;

    var topBar = renderer.makeRectangle(4/15 * width,-6/30 * height,22.5/15 * width,3/30 * height);
    topBar.fill = Color.pipeRails;
    topBar.noStroke();

    var bottomBar = renderer.makeRectangle(4/15 * width,6/30 * height,22.5/15 * width,3/30 * height);
    bottomBar.fill = Color.pipeRails;
    bottomBar.noStroke();

    var leftBar = renderer.makeRectangle(-6/15 * width, 4/30 * height, 3/15 * width,22/30 * height);
    leftBar.fill = Color.pipeRails;
    leftBar.noStroke();
    var rightBar = renderer.makeRectangle(6/15 * width, 4/30 * height, 3/15 * width,22/30 * height);
    rightBar.fill = Color.pipeRails;
    rightBar.noStroke();

    var group = renderer.makeGroup(leftBar, rightBar, topBar, bottomBar);
    group.translation.set(x,y);
    return group;
  };

  var make_pipe = function (owner, type, initState, graphics) {
    graphics.rotation = initState * Math.PI/2;
    return {
      owner: owner
    , type: type
    , graphics: graphics
    , duration: 1000
    , cooldown: 200
    , timeStarted: undefined
    , currState: initState
    , _shade: function (col) {
        this.graphics.fill = col;
      }
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
    , snap_to_state: function (state) {
        this.currState = state;
        this.graphics.rotation = state * Math.PI/2;
      }
    };
  };

  var G = {
    make_ouroboros_tile: function () {
      return {
        type: Constants.ouroborosTile
      }
    }
  , make_crash_tile: function () {
      return {
        type: Constants.crashTile
      }
    }
  , make_ball: function (owner, renderer, dims) {
      var x = dims.x? dims.x : 0
        , y = dims.y? dims.y : 0
        , radius = dims.radius? dims.radius : 30
        , graphics = renderer.makeCircle(x,y,radius);

      var getNextPos = function (currTime, startTime, state) {
          var elapsed = currTime - startTime;
          var scale = elapsed * Constants.ballSpeedFactor;
          var newX = scale * state.directionVector.x + state.x;
          var newY = scale * state.directionVector.y + state.y;
          return {x: newX, y: newY};
      };

      graphics.fill = Color.ball;
      graphics.noStroke();

      return {
        type: 'BALL'
      , graphics: graphics
      , startTime: undefined
      , startPos: {x: x, y: y}
      , startDirectionVector: {x: 0, y: -1}
      , lastTile: { x: Math.ceil(x/Constants.gridSquareSide)
                  , y: Math.ceil(y/Constants.gridSquareSide)}
      , currState: {x: x, y: y, directionVector: {x: 0, y: -1}}
      , reset_pos: function (startTime) {
          this.startTime = startTime;
          this.lastTile = { x: Math.ceil(this.startPos.x/Constants.gridSquareSide)
                     , y: Math.ceil(this.startPos.y/Constants.gridSquareSide)};
          this.currState = { x: this.startPos.x
                           , y: this.startPos.y
                           , directionVector: this.startDirectionVector};
        }
      , simulate: function (currTime) {
          if (this.startTime === undefined) {
            this.startTime = currTime;
          }
          var newPos = getNextPos(currTime, this.startTime, this.currState);
          this.graphics.translation.set(newPos.x, newPos.y);

        }
      , should_reset: function (grid) {
          var oldGridLoc = { x: Math.ceil((this.currState.x)/Constants.gridSquareSide )
                           , y: Math.ceil((this.currState.y)/Constants.gridSquareSide )};
          var nextGridLoc = { x: oldGridLoc.x + this.currState.directionVector.x
                            , y: oldGridLoc.y + this.currState.directionVector.y};
          if (grid.hasOwnProperty(nextGridLoc.x) && grid[nextGridLoc.x].hasOwnProperty(nextGridLoc.y)) {
            var gridItem = grid[nextGridLoc.x][nextGridLoc.y];
            // gridItem._shade('blue');
            if (gridItem.type === Constants.ouroborosTile) {
              return Constants.resetReason.ouroboros;
            }

            if (gridItem.type === Constants.crashTile) {
              return Constants.resetReason.crash;
            }

            if (gridItem.get_result === undefined || gridItem.get_result(this.currState.directionVector) === false) {
              // console.log("RESET BECAUSE "+gridItem.currState);
              return Constants.resetReason.hitWall;
            }
          } else {
            return Constants.resetReason.escapedSpace;
          }
          return false;
        }
      , change_state_if_necessary: function (currTime, grid) {
          var newPos = getNextPos(currTime, this.startTime, this.currState);
          var oldGridLoc = this.lastTile;//{ x: Math.ceil((this.currState.x)/Constants.gridSquareSide)
                           //, y: Math.ceil((this.currState.y)/Constants.gridSquareSide)};

          var nextGridLoc = { x: oldGridLoc.x + this.currState.directionVector.x
                            , y: oldGridLoc.y + this.currState.directionVector.y};

        if (Math.abs(newPos.x - (oldGridLoc.x * Constants.gridSquareSide - Constants.gridSquareSide/2)) >= Constants.gridSquareSide ||
          Math.abs(newPos.y - (oldGridLoc.y * Constants.gridSquareSide - Constants.gridSquareSide/2)) >= Constants.gridSquareSide) {
            this.startTime = currTime;
            // console.log("DIR "+this.currState.directionVector.x+", "+this.currState.directionVector.y);
            this.lastTile = {x: nextGridLoc.x, y: nextGridLoc.y};
            this.currState.x = newPos.x;
            this.currState.y = newPos.y;
            // console.log("AT "+this.lastTile.x+", "+this.lastTile.y);
            if (grid.hasOwnProperty(nextGridLoc.x) && grid[nextGridLoc.x].hasOwnProperty(nextGridLoc.y)) {
              var gridItem = grid[nextGridLoc.x][nextGridLoc.y];
              if (gridItem.type === Constants.angledPipe ||
                  gridItem.type === Constants.straightPipe) {
                var newDir = gridItem.get_result(this.currState.directionVector);
                // console.log("SHADE");
                if (newDir !== false) {
                  this.currState.directionVector = newDir;
                } else {
                  console.log("ERROR, SHOULD RESET!");
                }
              }
            }

            return true;
          }
        }
      , snap_to_state: function (state, currTime) {
          this.startTime = currTime;
          this.currState = state;
          this.lastTile = { x: Math.ceil(state.x/Constants.gridSquareSide)
                          , y: Math.ceil(state.y/Constants.gridSquareSide)};
          this.graphics.translation.set(state.x,state.y);
        }
      };
    }
  , make_straight_pipe: function (owner, renderer, dims, initState) {
      var graphics = make_straight_pipe_graphics(renderer, dims);
      var p = make_pipe(owner, Constants.straightPipe, initState, graphics);
      p.get_result = function (direction) {
        if (p.currState % 2 === 0 && direction.y !== 0 && direction.x === 0) {
          return {x: 0, y: direction.y};
        }
        if (p.currState % 2 === 1 && direction.y === 0 && direction.x !== 0) {
          return {x: direction.x, y: 0};
        }

        return false;
      }
      return p;
    }
  , make_rh_pipe: function (owner, renderer, dims, initState) {
      var graphics = make_rh_pipe_graphics(renderer, dims);
      var p = make_pipe(owner, Constants.angledPipe, initState, graphics);
      p.get_result = function (direction) {
        if (p.currState % 4 === 0 && direction.y < 0 && direction.x === 0) {
          // From Below
          return {x: 1, y: 0};
        }
        if (p.currState % 4 === 0 && direction.y === 0 && direction.x < 0) {
          // From Right
          return {x: 0, y: 1};
        }

        if (p.currState % 4 === 1 && direction.y < 0 && direction.x === 0) {
          // From Below
          return {x: -1, y: 0};
        }
        if (p.currState % 4 === 1 && direction.y === 0 && direction.x > 0) {
          // From Left
          return {x: 0, y: 1};
        }

        if (p.currState % 4 === 2 && direction.y > 0 && direction.x === 0) {
          // From Above
          return {x: -1, y: 0};
        }
        if (p.currState % 4 === 2 && direction.y === 0 && direction.x > 0) {
          // From Left
          return {x: 0, y: -1};
        }

        if (p.currState % 4 === 3 && direction.y > 0 && direction.x === 0) {
          // From Above
          return {x: 1, y: 0};
        }
        if (p.currState % 4 === 3 && direction.y === 0 && direction.x < 0) {
          // From Right
          return {x: 0, y: -1};
        }

        return false;
      }
      return p;
    }
  };

  return G;
});