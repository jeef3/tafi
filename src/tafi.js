/*
 * tafi
 * https://github.com/jeef3/tafi
 *
 * Copyright (c) 2013 Jeff Knaggs
 * Licensed under the MIT license.
 */

(function($) {

  function Tafi(element, settings) {

  }

  if ($) {
    $.fn.tafi = function (settings) {
      return this.each(function () {
        return new Tafi(this, settings);
      });
    };
  }

}(jQuery));
