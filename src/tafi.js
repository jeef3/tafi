/*
 * Tafi
 * https://github.com/jeef3/tafi
 *
 * Copyright (c) 2013 Jeff Knaggs
 * Licensed under the MIT license.
 */

(function($) {

  function Tafi($element, settings) {
    var i,
      length,
      decisions,
      decision;

    this.initElements($element);
    this.initEvents();

    this.options = _rehydrateOptions(settings.options);
    this.path = settings.path;
    this.partials = settings.partials || {};
    this.decisions = [];

    this.currentJunction = _buidJunction.call(this);

    decisions = settings.decisions;
    for (i = 0, length = decisions.length; i < length; i++) {
      decision = decisions[i];

      this.makeDecision(decision);
    }
  }

  Tafi.prototype.initElements = function ($element) {

    // Container
    this.$container = $("<div />", {
      id: $element.attr("id"),
      "class": $element.attr("class")
    });
    this.$container.addClass("tafi");


    // Visible Input
    this.$nextDecision = $("<div />", {
      "class": "tafi-decision tafi-next-decision"
    });

    this.$input = $("<input />", {
      id: $element.attr("id"),
      type: "text",
      placeholder: $element.attr("placeholder"),
      required: $element.prop("required"),
      "class": "tafi-input"
    });
    this.$nextDecision.append(this.$input);

    // Hidden Input
    this.$hidden = $("<input />", {
      type: "hidden",
      name: $element.attr("name")
    });

    this.$container
      .append(this.$nextDecision)
      .append(this.$hidden);

    $element.replaceWith(this.$container);
  };

  Tafi.prototype.initEvents = function () {

    $(document)
      .on("click", $.proxy(_documentClick, this));

    this.$container
      .on("click", ".tafi-decision", $.proxy(_decisionClick, this))
      .on("decisionmade", $.proxy(_decisionMade, this));

    this.$input
      .on("focus", $.proxy(_inputFocus, this))
      .on("blur", $.proxy(_inputBlur, this))
      .on("keyup", $.proxy(_inputKeyup, this));
  };

  Tafi.prototype._redrawDecisions = function () {
    var i,
      length;

    this.$container.remove(".tafi-decision");

    for (length = this.decisions.length - 1, i = length; i > -1; i--) {
      this.$container.prepend(_buildDecision(this.decisions[i]));
    }
  };

  Tafi.prototype._updateInput = function () {
    var option = this.options[this.currentJunction.option];

    this.$input.attr("placeholder", option.title);
  };

  Tafi.prototype.showDecisionChoices = function ($decision) {
    this._hideChoices();

    $decision.addClass("tafi-decision-show-options");
  };

  Tafi.prototype._hideChoices = function () {
    this.$container
      .find(".tafi-decision")
      .removeClass("tafi-decision-show-options");
  };

  Tafi.prototype.makeDecision = function (choice) {
    var option = this.options[this.currentJunction.option],
      nextJunction = _getNextJunction.call(this, this.currentJunction.branches, choice),
      decision = { option: option, choice: option.findChoice(choice) };

    if (!nextJunction) throw new Error("Invalid decision, no branch exists for " + choice);

    this.decisions.push(decision);
    this.currentJunction = nextJunction;

    this.$container.trigger("decisionmade", decision);
  };

  var _getNextJunction = function (branches, choice) {
    var junctionRoot;

    $.each(branches, function (choiceValue, junction) {
      if (choiceValue === choice) {
        junctionRoot = junction;
        return false;
      }
    });

    if (!junctionRoot && branches["*"]) {
      junctionRoot = branches["*"];
    }

    if (!junctionRoot) {
      throw new Error("No path found for " + choice);
    }

    return _buidJunction.call(this, junctionRoot);
  };

  Tafi.prototype.delete = function (decision) {
    // if 'decision' was supplied, delete it and everything after it

    // Otherwise, delete most recent section, ie "back"
    this.decisions.pop();
    // TODO: Find the section element via data- attr's
    this.$nextDecision.before().remove();
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

  var _buidJunction = function (junctionRoot) {
    var junction;

    if (!junctionRoot) {
      junctionRoot = this.path;
    }

    if (typeof junctionRoot === "string") {
      junction = this.partials[junctionRoot];
    } else {
      junction = junctionRoot;
    }

    return junction;
  };

  var _buildDecision = function (decision) {
    var option = decision.option,
      choice = decision.choice,
      $inner = $("<span />"),
      $decision = $("<div />");

    $decision
      .addClass("tafi-decision")
      .addClass(option.isEditable() ? "tafi-editable-decision" : "tafi-noneditable-decision")
      .data("tafi-option", option.name)
      .data("tafi-choice", choice.value)
      .attr("title", "" + option.name + ": " + choice.label);

    $inner
      .addClass("tafi-decision-text")
      .text(choice.text);

    $decision
      .append($inner)
      .append(_buildOptionChoicesList(option));

    return $decision;
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

  var _documentClick = function (e) {
//    this._hideChoices();
  };

  var _decisionClick = function (e) {
    // Set the active decision as the clicked one

    // display the option choices
    var $choiceList = $(e.currentTarget).find(".tafi-option-choices");
    this.showDecisionChoices($choiceList);
  };

  var _decisionMade = function () {
    this._updateInput();
    this._redrawDecisions();
  };

  var _inputFocus = function (e) {
    var $choiceList = $(e.currentTarget).next();
    this.showDecisionChoices($choiceList);
  };

  var _inputBlur = function () {
    this._hideChoices();
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
    return !!this.choices;
  };

  Option.prototype.findChoice = function (value) {
    var i,
      length;

    if (!this.choices) return this.default;

    for (i = 0, length = this.choices.length; i < length; i++) {
      if (this.choices[i].value === value) return this.choices[i];
    }

    throw new Error("No choice found with value " + value);
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
