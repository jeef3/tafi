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
      choicesValues,
      choiceValue;

    this.initElements($element);
    this.initEvents();

    this.options = _rehydrateOptions(settings.options);
    this.path = settings.path;
    this.partials = settings.partials || {};
    this.decisions = [];

    this.currentJunction = _buildJunction.call(this);

    choicesValues = settings.choicesValues;
    for (i = 0, length = choicesValues.length; i < length; i++) {
      choiceValue = choicesValues[i];

      this.makeDecision(choiceValue);
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
      "class": "tafi-next-decision"
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
      .on("click", ".tafi-option-choice", $.proxy(_choiceClick, this))
      .on("makedecision", $.proxy(_decisionMade, this))
      .on("deletedecision", $.proxy(_decisionDeleted, this));

    this.$input
      .on("focus", $.proxy(_inputFocus, this))
//      .on("blur", $.proxy(_inputBlur, this))
      .on("keyup", $.proxy(_inputKeyup, this));
  };

  Tafi.prototype.redraw = function () {
    this._updateInput();
    this._redrawDecisions();
  };

  Tafi.prototype._redrawDecisions = function () {
    var i,
      length;

    this.$container.find(".tafi-decision").remove();

    for (length = this.decisions.length - 1, i = length; i > -1; i--) {
      this.$container.prepend(_buildDecision(this.decisions[i]));
    }
  };

  Tafi.prototype._updateInput = function () {
    var option = this.options[this.currentJunction.option];

    this.$input.attr("placeholder", option.title);


    this._updateCurrentChoices();
  };

  Tafi.prototype._updateCurrentChoices = function () {
    var option = this.options[this.currentJunction.option],
      $currentChoiceList = _buildOptionChoicesList.call(this, option);

    this.$nextDecision
      .find(".tafi-option-choices")
        .remove()
        .end()
      .append($currentChoiceList);
  };

  Tafi.prototype.showDecisionChoices = function ($decision) {
    this._hideChoices();

    $decision.addClass("tafi-decision-show-options");
  };

  Tafi.prototype._hideChoices = function () {
    this.$container
      .find(".tafi-decision, .tafi-next-decision")
      .removeClass("tafi-decision-show-options");
  };

  Tafi.prototype.makeDecision = function (choiceValue) {
    var option = this.options[this.currentJunction.option],
      nextJunction = _getNextJunction.call(this, this.currentJunction.branches, choiceValue),
      nextOption = this.options[nextJunction.option],
      decision = { option: option, choice: option.findChoice(choiceValue) },
      onlyOption;

    if (!nextJunction) throw new Error("Invalid decision, no branch exists for " + choiceValue);

    this.decisions.push(decision);
    this.currentJunction = nextJunction;

    this.$container.trigger("makedecision", decision);

    // If, from here, there is only one way to go, take it.
    if (!nextOption.choices ||
        $.map(nextOption.choices, function (n, i) { return i; }).length === 1) {

      onlyOption = nextJunction.branches["*"];
      this.makeDecision(onlyOption);
    }
  };

  Tafi.prototype.deleteDecision = function (decision) {
    var index = this.decisions.indexOf(decision),
      removeTo = index === -1 ? - 1 : (this.decisions.length),
      removed = this.decisions.slice(index),
      junction,
      i,
      length,
      decision;

    this.decisions = this.decisions.slice(0, removeTo);

    junction = _buildJunction.call(this);

    // TODO: How to skip implicit decisions (e.g.: separator) and just delete the thing before it?
    for (i = 0, length = this.decisions.length; i < length; i++) {
      decision = this.decisions[i];

      junction = _getNextJunction.call(this, junction.branches, decision.choice.value || decision.choice);
    }

    this.currentJunction = junction;

    this.$container.trigger("deletedecision", removed);

    // If, from here, we are at an implicit decision, go back one more
    if (removed.length === 1 && !removed[0].option.choices) {
      this.deleteDecision();
    }
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

  var _buildJunction = function (junctionRoot) {
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

    return _buildJunction.call(this, junctionRoot);
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
      .data("tafi-choice", choice.value || choice)

    if (option.title && choice.label) {
      $decision.attr("title", "" + option.title + ": " + choice.label);
    }

    $inner
      .addClass("tafi-decision-text")
      .text(choice.text || choice);

    $decision
      .append($inner)
      .append(_buildOptionChoicesList(option));

    return $decision;
  };

  var _buildOptionChoicesList = function (option) {
    var $optionChoices;

    if (!option.choices) return $();

    $optionChoices = $("<ul />", { "class": "tafi-option-choices" });

    // TODO: Take an optional class value from dev? e.g.: dropdown-menu
    // $optionChoices.addClass(settings.optionChoicesClass);

    $.each(option.choices, function (index, choice) {
      var $li = $("<li />");

      $li
        .data("tafi-choice-value", choice.value)
        .addClass("tafi-option-choice")
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
    this.showDecisionChoices($(e.currentTarget));
  };

  var _choiceClick = function (e) {
    var choiceValue = $(e.currentTarget).data("tafi-choice-value");
    this.makeDecision(choiceValue);
  };

  var _decisionMade = function () {
    this.redraw();
    this.$input.focus();
  };

  var _decisionDeleted = function () {
    this.redraw();
  };

  var _inputFocus = function (e) {
    var $choiceList = $(e.currentTarget).parent();
    this.showDecisionChoices($choiceList);
  };

  var _inputBlur = function () {
    this._hideChoices();
  };

  var _inputKeyup = function (e) {
    switch (e.which) {
      // On 8 (backspace), when at the start, this.delete()
      case 8: this.deleteDecision(); break;

      // On 13 (enter) or tab, select and move next

      // On 27 (Escape), hide the choices
//      case 27: this._hideChoices(); break;
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
