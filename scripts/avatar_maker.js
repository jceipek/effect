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
    var topBar = renderer.makeRectangle(0,-height/2 + (7/30 * height)/2 + (2/30 * height),width,7/30 * height);
    topBar.fill = Color.pipeCrossbars;
    topBar.noStroke();
    var midBar = renderer.makeRectangle(0,0,width,6/30 * height);
    midBar.fill = Color.pipeCrossbars;
    midBar.noStroke();
    var bottomBar = renderer.makeRectangle(0,-height/2 + 21/30 * height + (7/30 * height)/2,width,7/30 * height);
    bottomBar.fill = Color.pipeCrossbars;
    bottomBar.noStroke();
    var group = renderer.makeGroup(leftBar, rightBar, midBar, topBar, bottomBar);
    group.translation.set(x,y);
    return group;
  };

  var make_rh_pipe_graphics = function (renderer, dims) {
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

    var group = renderer.makeGroup(leftBar, rightBar);
    group.translation.set(x,y);
    return group;
  };

  var make_pipe = function (owner, type, graphics) {
    return {
      owner: owner
    , type: type
    , graphics: graphics
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

  var G = {
    make_ball: function (owner, renderer, dims) {
      var x = dims.x? dims.x : 0
        , y = dims.y? dims.y : 0
        , radius = dims.radius? dims.radius : 15
        , graphics = renderer.makeCircle(x,y,radius);

      graphics.fill = Color.ball;
      graphics.noStroke();

      return {
        graphics: graphics
      , startTime: undefined
      , directionVector: {x: 0, y: -1}
      , startPos: {x: x, y: y}
      , lastPos: {x: x, y: y}
      , resetPos: function (startTime) {
          this.startTime = startTime;
          this.lastPos = {x: this.startPos.x, y: this.startPos.y};
        }
      , simulate: function (currTime) {
          if (this.startTime === undefined) {
            this.startTime = currTime;
          }
          var elapsed = currTime - this.startTime;
          var scale = elapsed * 0.01;
          var newX = scale * this.directionVector.x + this.startPos.x;
          var newY = scale * this.directionVector.y + this.startPos.y;
          this.graphics.translation.set(newX, newY);
        }
      , snapToState: function (state) {
          this.lastPos = state;
          this.graphics.translation.set(state.x,state.y);
        }
      };
    }
  , make_straight_pipe: function (owner, renderer, dims) {
      var graphics = make_straight_pipe_graphics(renderer, dims);
      return make_pipe(owner, Constants.straightPipe, graphics);
    }
  , make_rh_pipe: function (owner, renderer, dims) {
      var graphics = make_rh_pipe_graphics(renderer, dims);
      return make_pipe(owner, Constants.angledPipe, graphics);
    }
  };

  return G;
});