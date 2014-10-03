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

define(['server'], function(Server) {
  Server.init();
});