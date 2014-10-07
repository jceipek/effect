define({
    requiredClients: 14
  , firebaseUrl: 'https://luminous-heat-1848.firebaseio.com'
  , canvasDims: { width: 640, height: 480 }
  , noOwner: -2
  , straightPipe: 'Straight'
  , angledPipe: 'Angled'
  , ouroborosTile: 'Ouroboros'
  , crashTile: 'Crash'
  , gridSquareSide: 30*2
  , pipeWidth: 15*2
  , pipeHeight: 30*2
  , ballSpeedFactor: 0.04
  , resetReason: {
      ouroboros: 'OUROBOROS_REASON'
    , crash: 'CRASH_REASON'
    , hitWall: 'WALL_HIT_REASON'
    , escapedSpace: 'ESCAPED_REASON'
    }
  });