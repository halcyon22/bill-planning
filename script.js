$(function() {
  $("#sortable").sortable();
  $("#sortable").disableSelection();
  $("#nextMonth").on("click", nextMonth);
  $("#addRow").on("click", addRow);
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

  let row = $("<li/>");
  makeInputs(row, {
    date: localDate(),
    amount: 100.01,
    payee: ""
  });
  row.appendTo("#sortable");

  initRowEvents(row);
  onChange();
}

function nextMonth() {
  const items = $("#sortable li");
  for (let i = 0; i < items.length; i++) {
    const li = items[i];
    let current = $(li).children(".datepicker").datepicker("getDate");
    let day = current.getDate();
    current.setMonth(current.getMonth() + 1);
    if (current.getDate() != day) {
      current.setDate(0);
    }
    $(li).children(".datepicker").datepicker("setDate", current);
  }
}

function deleteRow(event) {
  $(event.target.parentElement).remove();
  
  onChange();
}

var debounce = null;
function save() {
  clearTimeout(debounce);
  debounce = setTimeout(doSave, 100);
}

function doSave() {
  const items = $("#sortable li");
  let data = [];
  for (let i = 0; i < items.length; i++) {
    data[i] = {
      date: $(items[i]).children(".datepicker").val(),
      amount: $(items[i]).children(".amount").val().replace(/[^\d\.\-]/g, ''),
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
      let row = $("<li/>");
      
      makeInputs(row, {
        date: localDate(),
        amount: 100.01,
        payee: value
      });

      row.appendTo("#sortable");
    });
  
    save();

  // rebuild from storage
  } else {
    data.forEach(function(value){
      let row = $("<li/>");
      
      makeInputs(row, {
        date: value.date,
        amount: value.amount,
        payee: value.payee
      });

      row.appendTo("#sortable");
    });
  }

  initRowEvents();

  doCalc();
}

function initRowEvents(singleRow) {
  $(".datepicker").datepicker(datepickerConfig);
  $(".payee").autocomplete(autocompleteConfig);
  $(".deleteRow").on("click", deleteRow);

  let amountElem = ".amount";
  let sumElem = ".sum";
  if (!singleRow) {
    AutoNumeric.multiple(amountElem, amountConfig);
    AutoNumeric.multiple(sumElem, sumConfig);
  } else {
    amountElem = $(singleRow).children(".amount")[0];
    new AutoNumeric(amountElem, amountConfig);

    sumElem = $(singleRow).children(".sum")[0];
    new AutoNumeric(sumElem, sumConfig);
  }
  $(amountElem).on("autoNumeric:rawValueModified", onAmountChange);
  $(sumElem).on("autoNumeric:rawValueModified", onSumChange);
}

function onAmountChange(event) {
  
  const newval = event.detail.newRawValue;
  if (newval > 0) {
    $(event.target).addClass('positive').removeClass('negative');
  } else if (newval < 0) {
    $(event.target).addClass('negative').removeClass('positive');
  } else {
    $(event.target).removeClass('negative').removeClass('positive');
  }

  onChange();
}

function onSumChange(event) {
  
  const newval = event.detail.newRawValue;
  if (newval < 1000) {
    $(event.target).addClass('low');
  } else {
    $(event.target).removeClass('low');
  }

  onChange();
}

function onChange() {
  doCalc();
  save();
}

function makeInputs(row, options) {
  $("<input/>", {
    size: 6,
    "class": "datepicker",
    value: options.date
  }).appendTo(row);

  let sign = options.amount > 0 ? "positive" : "";
  sign = options.amount < 0 ? "negative" : sign;
  $("<input/>", {
    "class": `amount money ${sign}`,
    value: options.amount
  }).appendTo(row);
  
  $("<input/>", {
    "class": "sum money",
    disabled: true
  }).appendTo(row);
  $("<input/>", {
    size: 10,
    "class": "payee",
    value: options.payee
  }).appendTo(row);
  $("<input/>", {
    type: "button",
    "class": "deleteRow",
    value: "x"
  }).appendTo(row);
}

function localDate() {
  let local = new Date();
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toJSON().slice(0, 10);
}

const datepickerConfig = {
  dateFormat: $.datepicker.ISO_8601
}

const payees = [
  "BASELINE",
  "paycheck",
  "discover",
  "water",
  "verizon",
  "xcel",
  "target",
  "garbage",
  "centerpoint",
  "charter",
  "kohls",
  "sienna",
  "mortgage",
  "braces",
  "investment"
];

const autocompleteConfig = {
  source: payees,
  delay: 0,
  change: onChange
};

const amountConfig = {
  currencySymbol: "$",
  showOnlyNumbersOnFocus: true
};

const sumConfig = {
  currencySymbol: "$",
  noEventListeners: true
};
