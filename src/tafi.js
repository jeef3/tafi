/*
 * Tafi
 * https://github.com/jeef3/tafi
 *
 * Copyright (c) 2013 Jeff Knaggs
 * Licensed under the MIT license.
 */

(function($) {

  function Tafi($element, settings) {

    this.sections = [];

    this.initElements($element);
    this.initEvents();

    this.options = _rehydrateOptions(settings.options);
    this.partials = settings.partials || {};

    this.decision(_findDecision(settings.path));
  }

  Tafi.prototype.initElements = function ($element) {

    // Container
    this.$container = $("div", {
      id: $element.attr("id"),
      "class": $element.attr("class")
    });
    this.$container.addClass("tafi");


    // Visible Input
    this.$nextSection = $("div", {
      "class": "tafi-section tafi-next-section"
    });

    this.$input = $("input", {
      type: "text",
      placeholder: $element.attr("placeholder"),
      required: $element.prop("required"),
      "class": "tafi-input"
    });
    this.$nextSection.append(this.$input);

    // Hidden Input
    this.$hidden = $("input", {
      type: "hidden",
      name: $element.attr("name")
    });


    // TODO: Generate a hidden input for each section?
  };

  Tafi.prototype.initEvents = function () {

    this.$container
      .on("click", ".tafi-section", $.proxy(_sectionClick));

    this.$input
      .on("focus", $.proxy(this, _inputFocus))
      .on("blur", $.proxy(this, _inputBlur))
      .on("keyup", $.proxy(this, _inputKeyup));
  };

  Tafi.prototype.showSectionChoices = function (section, option) {

  };

  Tafi.prototype.hideChoices = function () {

  };

  Tafi.prototype.selectOptionChoice = function (option) {

  };

  Tafi.prototype.currentSection = function () {

  };

  Tafi.prototype.decision = function (decision) {
    if (!decision) return this.currentDecision;

    this.currentDecision = decision;

    this.$nextSection.append(_buildOptionChoicesList(decision.option.choices));
    this.$input.attr("title", option.name);
  };

  Tafi.prototype.makeDecision = function (choice) {
    var decision = this.decision(),
      option = decision.option,
      branches = decision.branches,
      path = branches[choice.value],
      $section = _buildSelectedSection(option, choice);

    // Add the DOM elements for the new section and clear the input
    this.$nextSection
      .val("")
      .before($section);

    // If there was no match, see if a wildcard option was supplied
    if (!path) {
      path = branches["*"];
    }

    if (!path) {
      throw new Error("Could not find a path to follow");
    }

    if (typeof(path) === "string" && path.indexOf("%") === 0) {
      path = this.partials[path];
    }

    this.sections.push({
      option: option.name,
      choice: choice
    });

    this.decision(_findDecision(path));
  };

  Tafi.prototype.delete = function (section) {
    // if 'section' was supplied, delete it and everything after it

    // Otherwise, delete most recent section, ie "back"
    this.sections.pop();
    // TODO: Find the section element via data- attr's
    this.$nextSection.before().remove();
  };

  Tafi.prototype.reset = function () {
    // Clear all and return to start
  };

  //
  // Private

  var _rehydrateOptions = function (optionsData) {
    var options = {};

    $.each(optionsData, function (name, option) {
      options[name] = new Option(name, option);
    });

    return options;
  };

  var _findDecision = function (path) {
    var name,
      option,
      branches;

    if (!path) throw new Error("You need to provide a path");

    $.each(path, function (key, value) {
      name = key;
      branches = value;

      // There should only be one root
      return false;
    });

    if (!name) throw new Error("Your path must have a root");

    option = this.options[name];

    if (!option) throw new Error("The specified root (" + name + ") was not found in the options list");
    if (!branches) throw new Error("There were no branches specified for the root");

    return { option: option, branches: branches };
  }

  var _buildSelectedSection = function (option, choice) {
    var $inner = $("span"),
      $section = $("div");

    $section
      .addClass("tafi-section")
      .addClass(option.isEditable() ? "tafi-editable-section" : "tafi-noneditable-section")
      .data("tafi-option", option.name)
      .data("tafi-choice", choice.value)
      .attr("title", "" + option.name + ": " + choice.label);

    $inner
      .addClass("tafi-section-text")
      .text(choice.text);

    $section
      .append($inner)
      .append(_buildOptionChoicesList(option));

    return $section;
  };

  var _buildOptionChoicesList = function (option) {
    var $optionChoices = $("ul", {
      "class": "tafi-option-choices"
    });

    // TODO: Take an optional class value from dev? e.g.: dropdown-menu
    // $optionChoices.addClass(settings.optionChoicesClass);

    $.each(option.choices, function (choice) {
      var $li = $("li");

      $li.data("tafi-value", choice.value);

      $li.append("a", {
        href: "#",
        role: "button"
      }).text(choice.label);

      $optionChoices.append($li);
    });

    return $optionChoices;
  };


  //
  // Events

  var _sectionClick = function (e) {
    // Set the active section as the clicked one

    // display the option choices
  };

  var _inputFocus = function (e) {
    this.showSectionChoices(this.decision().option.choices);
  };

  var _inputBlur = function (e) {
    this.hideChoices();
  };

  var _inputKeyup = function (e) {
    switch (e.which) {
      // On delete, when at the start, this.delete()
      // On enter or tab, select and move next
    }
  };

  //
  // Section
  function Option(name, option) {

    $.each(option, $.proxy(function (key, value) {
      this[key] = value;
    }));

    this.name = name;
  }

  Option.prototype.isEditable = function () {

  };


  //
  // jQuery plugin

  $.fn.tafi = function (settings) {
    return this.each(function () {
      var tafi = new Tafi($(this), settings);
      return tafi.container;
    });
  };
}(jQuery));
