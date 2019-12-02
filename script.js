$(function() {
  $("#sortable").sortable();
  $("#sortable").disableSelection();
  $("#addRow").on("click", addRow);
  $("#calc").on("click", doCalc);
  $("#sortable").on("sortupdate", onChange);

  load();
});

function doCalc() {
  const items = $("#sortable li");
  for (let i = 0; i < items.length; i++) {
    const li = items[i];
    const amount = AutoNumeric.getAutoNumericElement($(li).children(".amount")[0]).getNumber();

    if (i == 0 || $(li).children(".payee").val() == "BASELINE") {
      AutoNumeric.getAutoNumericElement($(li).children(".sum")[0]).set(amount);

    } else {
      const previousSum = AutoNumeric.getAutoNumericElement($(items[i - 1]).children(".sum")[0]).getNumber();
      AutoNumeric.getAutoNumericElement($(li).children(".sum")[0]).set(amount + previousSum);
    }
  }
}

function addRow() {
  const allLi = $("#sortable li");
  const lastLi = allLi[allLi.length - 1];
  const newLi = $(lastLi).clone(false);
  $(newLi).children(".payee").val("");
  $(newLi).appendTo("#sortable");
  
  initRowEvents();
  onChange();
}

function deleteRow(event) {
  $(event.target.parentElement).remove();
  
  onChange();
}

function save() {
  const items = $("#sortable li");
  let data = [];
  for (let i = 0; i < items.length; i++) {
    data[i] = {
      date: $(items[i]).children(".datepicker").val(),
      amount: $(items[i]).children(".amount").val(),
      payee: $(items[i]).children(".payee").val()
    };
  }

  localStorage.setItem("billdata", JSON.stringify(data));

  console.log(`saved ${data.length} : ${new Date().toLocaleTimeString()}`);
}

function load() {
  let data = [];
  if (localStorage.getItem("billdata")) {
    data = JSON.parse(localStorage.getItem("billdata"));
  }
 
  console.log(`loaded ${data.length}`);

  // defaults
  if (data.length == 0) {
    payees.forEach(function(value) {
      let line = $("<li/>");
      
      makeInputs(line, {
        date: localDate(),
        amount: 100.01,
        payee: value
      });

      line.appendTo("#sortable");
    });
  
    save();

  // rebuild from storage
  } else {
    data.forEach(function(value){
      let line = $("<li/>");
      
      makeInputs(line, {
        date: value.date,
        amount: value.amount,
        payee: value.payee
      });

      line.appendTo("#sortable");
    });
  }

  initRowEvents();

  doCalc();
}

function initRowEvents() {
  $(".datepicker").datepicker();
  // $(".amount").change(onChange);
  $(".payee").autocomplete(autocompleteConfig);
  $(".deleteRow").on("click", deleteRow);

  AutoNumeric.multiple(".amount", {
    currencySymbol: "$",
    showOnlyNumbersOnFocus: true
  });
  AutoNumeric.multiple(".sum", {
    currencySymbol: "$"
  });
}

function makeInputs(line, options) {
  $("<input/>", {
    size: 6,
    "class": "datepicker",
    value: options.date
  }).appendTo(line);
  $("<input/>", {
    "class": "amount money",
    value: options.amount
  }).appendTo(line);
  $("<input/>", {
    "class": "sum money",
    disabled: true
  }).appendTo(line);
  $("<input/>", {
    size: 10,
    "class": "payee",
    value: options.payee
  }).appendTo(line);
  $("<input/>", {
    type: "button",
    "class": "deleteRow",
    value: "x"
  }).appendTo(line);
}

function onChange() {
  doCalc();
  save();
}

function localDate() {
  let local = new Date();
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toJSON().slice(0, 10);
}

const payees = [
  "BASELINE",
  "paycheck",
  "discover",
  "water",
  "verizon",
  "xcel",
  "target",
  "centerpoint",
  "charter",
  "kohls",
  "sienna",
  "mortgage",
  "braces"
];

const autocompleteConfig = {
  source: payees,
  delay: 0,
  change: onChange
};
