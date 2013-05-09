/*
 * Tafi
 * https://github.com/jeef3/tafi
 *
 * Copyright (c) 2013 Jeff Knaggs
 * Licensed under the MIT license.
 */

(function($) {

  function Tafi($element, settings) {

    this.options = _rehydrateOptions(settings.options);
    this.partials = settings.partials || {};

    // TODO: ensure this validates that the path is valid
    this.sections = _initSections(settings.sections);

    this.initElements($element);
    this.initEvents();

    this.decision(_findDecision(settings.path, this.options));
  }

  Tafi.prototype.initElements = function ($element) {
    var i,
      length,
      section,
      option,
      choice;

    // Container
    this.$container = $("<div />", {
      id: $element.attr("id"),
      "class": $element.attr("class")
    });
    this.$container.addClass("tafi");


    // Visible Input
    this.$nextSection = $("<div />", {
      "class": "tafi-section tafi-next-section"
    });

    this.$input = $("<input />", {
      id: $element.attr("id"),
      type: "text",
      placeholder: $element.attr("placeholder"),
      required: $element.prop("required"),
      "class": "tafi-input"
    });
    this.$nextSection.append(this.$input);

    // Hidden Input
    this.$hidden = $("<input />", {
      type: "hidden",
      name: $element.attr("name")
    });

    // TEMP: Current sections
    for (i = 0, length = this.sections.length; i < length; i++) {
      section = this.sections[i];
      option = this.options[section.option];
      choice = option.findChoice(section.choice);

      this.$container.append(_buildSelectedSection(option, choice));
    }

    this.$container
      .append(this.$nextSection)
      .append(this.$hidden);

    $element.replaceWith(this.$container);


    // TODO: Generate a hidden input for each section?
  };

  Tafi.prototype.initEvents = function () {

    this.$container
      .on("click", ".tafi-section", $.proxy(_sectionClick, this));

    this.$input
      .on("focus", $.proxy(_inputFocus, this))
      .on("blur", $.proxy(_inputBlur, this))
      .on("keyup", $.proxy(_inputKeyup, this));
  };

  Tafi.prototype.showSectionChoices = function ($choiceList) {
    this.hideChoices();
    $choiceList.addClass("show");
  };

  Tafi.prototype.hideChoices = function () {
    this.$container
      .find(".tafi-option-choices")
      .removeClass("show");
  };

  Tafi.prototype.selectOptionChoice = function (option) {

  };

  Tafi.prototype.currentSection = function () {

  };

  Tafi.prototype.decision = function (decision) {
    if (!decision) return this.currentDecision;

    this.currentDecision = decision;

    this.$nextSection.append(_buildOptionChoicesList(decision.option));
    this.$input.attr("title", decision.option.name);
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

  var _initSections = function (sectionsData) {
    var i,
      length,
      sections = [];

    for (i = 0, length = sectionsData.length; i < length; i++) {
      sections.push(sectionsData[i]);
    }

    return sections;
  };

  var _rehydrateOptions = function (optionsData) {
    var options = {};

    $.each(optionsData, function (name, option) {
      options[name] = new Option(name, option);
    });

    return options;
  };

  var _findDecision = function (path, options) {
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

    option = options[name];

    if (!option) throw new Error("The specified root (" + name + ") was not found in the options list");
    if (!branches) throw new Error("There were no branches specified for the root");

    return { option: option, branches: branches };
  };

  var _buildSelectedSection = function (option, choice) {
    var $inner = $("<span />"),
      $section = $("<div />");

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
    var $optionChoices = $("<ul />", {
      "class": "tafi-option-choices"
    });

    // TODO: Take an optional class value from dev? e.g.: dropdown-menu
    // $optionChoices.addClass(settings.optionChoicesClass);

    $.each(option.choices, function (index, choice) {
      var $li = $("<li />");

      $li
        .data("tafi-value", choice.value)
        .append($("<a />", { href: "#", role: "button" }).text(choice.label));

      $optionChoices.append($li);
    });

    return $optionChoices;
  };


  //
  // Events

  var _sectionClick = function (e) {
    // Set the active section as the clicked one

    // display the option choices
    var $choiceList = $(e.currentTarget).find(".tafi-option-choices");
    this.showSectionChoices($choiceList);
  };

  var _inputFocus = function (e) {
    var $choiceList = $(e.currentTarget).next();
    this.showSectionChoices($choiceList);
  };

  var _inputBlur = function () {
    this.hideChoices();
  };

  var _inputKeyup = function (e) {
    switch (e.which) {
      // On delete, when at the start, this.delete()
      // On enter or tab, select and move next
    }
  };

  //
  // Option
  function Option(name, option) {

    var _this = this;
    $.each(option, function (key, value) {
      _this[key] = value;
    });

    this.name = name;
  }

  Option.prototype.isEditable = function () {
    return true;
  };

  Option.prototype.findChoice = function (value) {
    var i,
      length;

    for (i = 0, length = this.choices.length; i < length; i++) {
      if (this.choices[i].value === value) return this.choices[i];
    }
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
