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

    this.options = this._rehydrateOptions(settings.options);
    this.path = settings.path;
    this.partials = settings.partials || {};
    this.decisions = [];

    this.$activeDecision = $();
    this.activeChoiceIndex = 0;

    this.currentJunction = this._buildJunction();

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
      .on("click", $.proxy(this._documentClick, this));

    $("[for='" + this.$container.attr("id") + "']")
      .on("click", $.proxy(function () { this.$input.focus() }, this));

    this.$container
      .on("click", ".tafi__decision", $.proxy(this._decisionClicked, this))
      .on("click", ".tafi__option-choice", $.proxy(this._choiceClicked, this))
      .on("mouseover", ".tafi__option-choice", $.proxy(this._choiceMouseover, this))
      .on("makedecision", $.proxy(this._decisionMade, this))
      .on("deletedecision", $.proxy(this._decisionDeleted, this));

    this.$input
      .on("focus", $.proxy(this._inputFocus, this))
      .on("keyup", $.proxy(this._inputKeyup, this))
      .on("keydown", $.proxy(this._inputKeydown, this));
  };

  Tafi.prototype.redraw = function () {
    this._redrawInput();
    this._redrawDecisions();

    this.repaint();
  };

  Tafi.prototype.repaint = function () {
    this._repaintActiveChoice();
  };

  Tafi.prototype._redrawDecisions = function () {
    var i,
      length;

    this.$container.find(".tafi__decision").remove();

    for (length = this.decisions.length - 1, i = length; i > -1; i--) {
      this.$container.prepend(this._buildDecision(this.decisions[i]));
    }
  };

  Tafi.prototype._redrawInput = function () {
    var option = this.options[this.currentJunction.option];

    this.$input.val(option.default);
    this.$input.attr("placeholder", option.title);

    this._updateCurrentChoices();
  };

  Tafi.prototype._updateCurrentChoices = function () {
    var option = this.options[this.currentJunction.option],
      filter = this.$input.val(),
      $currentChoiceList = this._buildOptionChoicesList(option, filter);

    this.$nextDecision
      .find(".tafi__option-choices")
        .remove()
        .end()
      .append($currentChoiceList);

    this._repaintActiveChoice();
  };

  Tafi.prototype.showDecisionChoices = function ($decision) {
    if ($decision.hasClass("tafi__decision-show-options")) return;

    this._hideChoices();

    this.$activeDecision = $decision;
    $decision.addClass("tafi__decision-show-options");
    this._repaintActiveChoice();
  };

  Tafi.prototype._hideChoices = function () {
    this.$container
      .find(".tafi__decision, .tafi__next-decision")
      .removeClass("tafi__decision-show-options");
  };

  Tafi.prototype.makeDecision = function (choiceValue, keepFocus) {
    var option = this.options[this.currentJunction.option],
      nextJunction = this._getNextJunction(this.currentJunction.branches, choiceValue),
      nextOption = this.options[nextJunction.option],
      decision = { option: option, choice: option.findChoice(choiceValue) },
      onlyOption;

    if (!nextJunction) throw new Error("Invalid decision, no branch exists for " + choiceValue);

    this.decisions.push(decision);
    this.currentJunction = nextJunction;

    this.activeChoiceIndex = 0;

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

    junction = this._buildJunction();

    // TODO: How to skip implicit decisions (e.g.: separator) and just delete the thing before it?
    for (i = 0, length = this.decisions.length; i < length; i++) {
      decision = this.decisions[i];

      junction = this._getNextJunction(junction.branches, decision.choice.value || decision.choice);
    }

    this.currentJunction = junction;

    this.activeChoiceIndex = 0;

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
    this.activeChoiceIndex -= 1;

    if (this.activeChoiceIndex < 0) this.activeChoiceIndex = 0;

    this._repaintActiveChoice();
  };

  Tafi.prototype.moveSelectionDown = function () {
    var choiceCount = this.$activeDecision.find(".tafi__option-choice").length - 1;
    this.activeChoiceIndex += 1;

    if (this.activeChoiceIndex > choiceCount) this.activeChoiceIndex = choiceCount;

    this._repaintActiveChoice();
  };

  Tafi.prototype.selectedChoice = function () {
    return this.$activeDecision
      .find(".tafi__option-choice")
      .eq(this.activeChoiceIndex)
      .data("tafi-choice-value");
  };

  Tafi.prototype.set = function (option, value) {
    this.options[option].default = value;
  };


  //
  // Private

  Tafi.prototype._rehydrateOptions = function (optionsData) {
    var options = {};

    $.each(optionsData, function (name, option) {
      options[name] = new Option(name, option);
    });

    return options;
  };

  Tafi.prototype._buildJunction = function (junctionRoot) {
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

  Tafi.prototype._getNextJunction = function (branches, choice) {
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

    return this._buildJunction(junctionRoot);
  };

  Tafi.prototype._buildDecision = function (decision) {
    var option = decision.option,
      choice = decision.choice,
      $inner = $("<span />"),
      $decision = $("<div />");

    $decision
      .addClass("tafi__decision")
      .addClass(option.isEditable() ? "tafi__decision--editable" : "tafi__decision--noneditable")
      .data("tafi-option", option.name)
      .data("tafi-choice", choice.value || choice)

    if (option.title && choice.label) {
      $decision.attr("title", "" + option.title + ": " + choice.label);
    }

    $inner
      .addClass("tafi__decision-text")
      .text(choice.text || choice);

    $decision
      .append($inner)
      .append(this._buildOptionChoicesList(option));

    return $decision;
  };

  Tafi.prototype._buildOptionChoicesList = function (option, filter) {
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
        .data("tafi-choice-value", choice.value)
        .addClass("tafi__option-choice")
        .append($("<a />").text(choice.label));

      $optionChoices.append($li);
    });

    return $optionChoices;
  };

  Tafi.prototype._repaintActiveChoice = function () {
    this.$container.find(".tafi__option-choice--active")
      .removeClass("tafi__option-choice--active");

    this.$activeDecision.find(".tafi__option-choice")
      .eq(this.activeChoiceIndex)
      .addClass("tafi__option-choice--active");
  };


  //
  // Events

  Tafi.prototype._documentClick = function (e) {
    if (!this.$input.is(":focus") &&
      !$(e.target).closest('.tafi__option-choices').length &&
      !$.contains(this.$container.get(0), e.target)) {

      this._hideChoices();
    }
  };

  Tafi.prototype._decisionClicked = function (e) {
    // Set the active decision as the clicked one

    // display the option choices
    this.showDecisionChoices($(e.currentTarget));
  };

  Tafi.prototype._choiceClicked = function (e) {
    var choiceValue = $(e.currentTarget).data("tafi-choice-value");
    this.makeDecision(choiceValue, true);
  };

  Tafi.prototype._choiceMouseover = function (e) {
    this.activeChoiceIndex = $(e.currentTarget).index();
    this._repaintActiveChoice();
  };

  Tafi.prototype._decisionMade = function (e, decision, keepFocus) {
    this.$input.val("");
    this.redraw();

    if (keepFocus) this.$input.focus();
  };

  Tafi.prototype._decisionDeleted = function () {
    this.redraw();
  };

  Tafi.prototype._inputFocus = function (e) {
    var $choiceList = $(e.currentTarget).parent();
    this.showDecisionChoices($choiceList);
  };

  Tafi.prototype._inputKeyup = function (e) {
    this._updateCurrentChoices();
  };

  Tafi.prototype._inputKeydown = function (e) {
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
