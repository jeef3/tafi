/*
 * Tafi
 * https://github.com/jeef3/tafi
 *
 * Copyright (c) 2013 Jeff Knaggs
 * Licensed under the MIT license.
 *
 * TODO: Have a 'end' state, so we can accept 'enter' for submit and update the final decision
 */

(function($) {

  function Tafi($element, settings) {
    var i,
      length,
      choicesValues,
      choiceValue;

    this.classes = settings.classes || {};
    this.options = this._rehydrateOptions(settings.options);
    this.path = settings.path;
    this.partials = settings.partials || {};
    this.decisions = [];

    this.$activeDecision = $();
    this.activeChoiceIndex = 0;

    this.currentJunction = this._buildJunction();

    this.initElements($element);
    this.initEvents();

    choicesValues = settings.choicesValues;
    if (choicesValues && choicesValues.length) {
      for (i = 0, length = choicesValues.length; i < length; i++) {
        choiceValue = choicesValues[i];

        this.makeDecision(choiceValue, false);
      }
    } else {
      this.redraw();
    }
  }

  Tafi.prototype.initElements = function ($element) {
    var hiddens;

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

    // Hidden Inputs (one per option)
    hiddens = [];
    $.each(this.options, function (name) {
      hiddens.push($("<input />", {
        type: "hidden",
        name: name
      }));
    });

    this.$container
      .append(this.$nextDecision)
      .append(this.$hidden)
      .append(hiddens);

    $element.replaceWith(this.$container);
  };

  Tafi.prototype.initEvents = function () {

    $(document)
      .on("click", $.proxy(this._documentClick, this));

    $(window)
      .on("resize", $.proxy(this._windowResized, this))

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
      .on("blur", $.proxy(this._inputBlur, this))
      .on("keyup", $.proxy(this._inputKeyup, this))
      .on("keydown", $.proxy(this._inputKeydown, this));
  };

  Tafi.prototype.redraw = function () {
    this._redrawInput();
    this._redrawDecisions();

    this.repaint();
  };

  Tafi.prototype.repaint = function () {
    this.$container.toggleClass("tafi--with-focus", this.$input.is(":focus"));

    this._repaintActiveChoice();

    this._calculateInputWidth();
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

    this.repaint();
  };

  Tafi.prototype._calculateInputWidth = function () {
    var spaceAvailable = this.$container.width(),
      $decisions = this.$container.find(".tafi__decision"),
      $nextDecision = this.$container.find(".tafi__next-decision");

    spaceAvailable -= ($nextDecision.outerWidth(true) - $nextDecision.width());

    $decisions.each(function () {
      spaceAvailable -= $(this).outerWidth(true);
    });

    $nextDecision.width(spaceAvailable);
  };

  Tafi.prototype.showDecisionChoices = function ($decision) {
    if ($decision.hasClass("tafi__decision-show-options")) return;

    this._hideChoices();

    this.$activeDecision = $decision;
    $decision.addClass("tafi__decision-show-options");
    this.repaint();
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

      if (nextJunction.branches) {
        onlyOption = nextJunction.branches["*"];
        this.makeDecision(onlyOption, keepFocus);
      } // No branches, end of the road
    }
  };

  Tafi.prototype.deleteDecision = function (decision) {
    var index = this.decisions.indexOf(decision),
      removeTo = index === -1 ? - 1 : (this.decisions.length),
      removed = this.decisions.slice(index),
      junction,
      i,
      length,
      d;

    this.decisions = this.decisions.slice(0, removeTo);

    junction = this._buildJunction();

    for (i = 0, length = this.decisions.length; i < length; i++) {
      d = this.decisions[i];

      junction = this._getNextJunction(junction.branches, d.choice.value || d.choice);
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

    this.repaint();
  };

  Tafi.prototype.moveSelectionDown = function () {
    var choiceCount = this.$activeDecision.find(".tafi__option-choice").length - 1;
    this.activeChoiceIndex += 1;

    if (this.activeChoiceIndex > choiceCount) this.activeChoiceIndex = choiceCount;

    this.repaint();
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
      return true;
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
      .data("tafi-choice", choice.value || choice);

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

    if (this.classes["option-choices"]) {
      $optionChoices.addClass(this.classes["option-choices"]);
    }

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
      this.repaint();
    }
  };

  Tafi.prototype._windowResized = function (e) {
    this._calculateInputWidth();
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
    this.repaint();
  };

  Tafi.prototype._decisionMade = function (e, decision, keepFocus) {
    var choice = typeof decision.choice === "string" ? decision.choice : decision.choice.value;

    this.$input.val("");
    this.$container
      .find("input[name='" + decision.option.name + "']")
      .val(choice);

    this.redraw();

    if (keepFocus) this.$input.focus();
  };

  Tafi.prototype._decisionDeleted = function (e, removed) {
    this.$container
      .find("input[name='" + removed.option.name + "']")
      .val(null);

    this.redraw();
  };

  Tafi.prototype._inputFocus = function (e) {
    var $choiceList = $(e.currentTarget).parent();
    this.showDecisionChoices($choiceList);

    // The input won't have :focus until this event has finished.
    setTimeout($.proxy(function () { this.repaint(); }, this), 0);
  };

  Tafi.prototype._inputBlur = function () {
    this.repaint();
  };

  Tafi.prototype._inputKeyup = function () {
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
      case 13:
        e.preventDefault(); // Otherwise the form will submit
        this.makeDecision(this.selectedChoice(), true);
        break;
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
