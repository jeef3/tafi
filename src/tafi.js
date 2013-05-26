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

    this.selectedChoiceIndex = -1;
    this.activeChoice = null;

    this.currentJunction = _buildJunction.call(this);

    choicesValues = settings.choicesValues;
    for (i = 0, length = choicesValues.length; i < length; i++) {
      choiceValue = choicesValues[i];

      this.makeDecision(choiceValue, false);
    }
  }

  Tafi.prototype.initElements = function ($element) {

    // Container
    this.$container = $("<div />", {
      id: $element.attr("id"),
      "class": $element.attr("class")
    });
    this.$container
      .addClass("tafi")
      .data("tafi", this);


    // Visible Input
    this.$nextDecision = $("<div />", {
      "class": "tafi__next-decision"
    });

    this.$input = $("<input />", {
      id: $element.attr("id"),
      type: "text",
      placeholder: $element.attr("placeholder"),
      required: $element.prop("required"),
      "class": "tafi__input"
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
      .on("click", ".tafi__decision", $.proxy(_decisionClicked, this))
      .on("click", ".tafi__option-choice", $.proxy(_choiceClicked, this))
      .on("mouseover", ".tafi__option-choice", $.proxy(_choiceMouseover, this))
      .on("makedecision", $.proxy(_decisionMade, this))
      .on("deletedecision", $.proxy(_decisionDeleted, this));

    this.$input
      .on("focus", $.proxy(_inputFocus, this))
      .on("keyup", $.proxy(_inputKeyup, this))
      .on("keydown", $.proxy(_inputKeydown, this));
  };

  Tafi.prototype.redraw = function () {
    this._updateInput();
    this._redrawDecisions();
  };

  Tafi.prototype._redrawDecisions = function () {
    var i,
      length;

    this.$container.find(".tafi__decision").remove();

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
      filter = this.$input.val(),
      $currentChoiceList = _buildOptionChoicesList.call(this, option, filter);

    this.$nextDecision
      .find(".tafi__option-choices")
        .remove()
        .end()
      .append($currentChoiceList);
  };

  Tafi.prototype.showDecisionChoices = function ($decision) {
    if ($decision.hasClass("tafi__decision-show-options")) return;

    this._hideChoices();

    $decision.addClass("tafi__decision-show-options");
  };

  Tafi.prototype._hideChoices = function () {
    this.$container
      .find(".tafi__decision, .tafi__next-decision")
      .removeClass("tafi__decision-show-options");
  };

  Tafi.prototype.makeDecision = function (choiceValue, keepFocus) {
    var option = this.options[this.currentJunction.option],
      nextJunction = _getNextJunction.call(this, this.currentJunction.branches, choiceValue),
      nextOption = this.options[nextJunction.option],
      decision = { option: option, choice: option.findChoice(choiceValue) },
      onlyOption;

    if (!nextJunction) throw new Error("Invalid decision, no branch exists for " + choiceValue);

    this.decisions.push(decision);
    this.currentJunction = nextJunction;

    this.$container.trigger("makedecision", [decision, keepFocus]);

    // If, from here, there is only one way to go, take it.
    if (!nextOption.choices ||
        $.map(nextOption.choices, function (n, i) { return i; }).length === 1) {

      onlyOption = nextJunction.branches["*"];
      this.makeDecision(onlyOption, keepFocus);
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

  Tafi.prototype.moveSelectionUp = function () {

  };

  Tafi.prototype.moveSelectionDown = function () {

  };

  Tafi.prototype.selectedChoice = function () {

  };

  Tafi.prototype.set = function (option, value) {

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
      .addClass("tafi__decision")
      .addClass(option.isEditable() ? "tafi__editable-decision" : "tafi__noneditable-decision")
      .data("tafi__option", option.name)
      .data("tafi__choice", choice.value || choice)

    if (option.title && choice.label) {
      $decision.attr("title", "" + option.title + ": " + choice.label);
    }

    $inner
      .addClass("tafi__decision-text")
      .text(choice.text || choice);

    $decision
      .append($inner)
      .append(_buildOptionChoicesList(option));

    return $decision;
  };

  var _buildOptionChoicesList = function (option, filter) {
    var $optionChoices;

    if (!option.choices) return $();

    $optionChoices = $("<ul />", { "class": "tafi__option-choices" });

    // TODO: Take an optional class value from dev? e.g.: dropdown-menu
    // $optionChoices.addClass(settings.optionChoicesClass);

    $.each(option.choices, function (index, choice) {
      var $li = $("<li />", { role: "button" });

      if (filter &&
        choice.label &&
        choice.label.toLowerCase().indexOf(filter.toLowerCase()) !== 0) return;

      $li
        .data("tafi__choice-value", choice.value)
        .addClass("tafi__option-choice")
        .append($("<a />").text(choice.label));

      $optionChoices.append($li);
    });

    return $optionChoices;
  };


  //
  // Events

  var _documentClick = function (e) {
    if (!$(e.target).closest('.tafi__option-choices').length &&
      !$.contains(this.$container.get(0), e.target)) {

      this._hideChoices();
    }
  };

  var _decisionClicked = function (e) {
    // Set the active decision as the clicked one

    // display the option choices
    this.showDecisionChoices($(e.currentTarget));
  };

  var _choiceClicked = function (e) {
    var choiceValue = $(e.currentTarget).data("tafi__choice-value");
    this.makeDecision(choiceValue, true);
  };

  var _choiceMouseover = function (e) {
    this._setActiveChoice($(e.currentTarget));
  };

  var _decisionMade = function (e, decision, keepFocus) {
    this.$input.val("");
    this.redraw();

    if (keepFocus) this.$input.focus();
  };

  var _decisionDeleted = function () {
    this.redraw();
  };

  var _inputFocus = function (e) {
    var $choiceList = $(e.currentTarget).parent();
    this.showDecisionChoices($choiceList);
  };

  var _inputKeyup = function (e) {
    this._updateCurrentChoices();
  };

  var _inputKeydown = function (e) {
    switch (e.which) {
      // Backspace/Delete
      case 8: if (e.currentTarget.selectionStart === 0) this.deleteDecision(); break;

      // Up/down
      case 38: this.moveSelectionUp(); break;
      case 40: this.moveSelectionDown(); break;

      // Escape
      case 27: this._hideChoices(); break;

      // On 13 (enter) or tab, select and move next
      case 13: this.makeDecision(this.selectedChoice(), true); break;
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

  $.fn.tafi = function () {
    var args = [].slice.call(arguments, 0),
      settings,
      method,
      optionName,
      optionValue,
      _$ = $(this),
      tafi;

    if (args.length === 1 && typeof args[0] === "object") {
      settings = args[0];

      tafi = new Tafi(_$, settings);

    } else if (args.length === 3 && typeof args[0] === "string") {
      method = args[0];
      optionName = args[1];
      optionValue = args[2];

      tafi = _$.data("tafi");
      tafi[method](optionName, optionValue);
    }

    return tafi.$container;
  };
}(jQuery));
