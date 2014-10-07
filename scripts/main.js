/*jshint node: true*/
/*jshint browser:true */
"use strict";

require.config({
  paths: {
    domReady: '3rd-party/domReady'
  , two: '3rd-party/two.min'
  , jquery: '3rd-party/jquery-2.1.1.min'
}
, shim: {
    jquery: {
      exports: '$'
    }
}
});

define(['server', 'color'], function(Server) {
  Server.init();
});