$(function () {
  $('#sortable').sortable();
  $('#sortable').disableSelection();
  $('#nextMonth').on('click', nextMonth);
  $('#addRow').on('click', addRow);
  $('#sortable').on('sortupdate', onChange);
  $('#save').on('click', saveToBackend);
  $('#load').on('click', loadFromBackend);
  $('#clear').on('click', clearBackendConfig);

  load();
});

function doCalc () {
  const items = $('#sortable li');
  for (let i = 0; i < items.length; i++) {
    const li = items[i];
    const amount = AutoNumeric.getAutoNumericElement($(li).children('.amount')[0]).getNumber();

    if (i === 0 || $(li).children('.payee').val() === 'BASELINE') {
      AutoNumeric.getAutoNumericElement($(li).children('.sum')[0]).set(amount);
    } else {
      const previousSum = AutoNumeric.getAutoNumericElement($(items[i - 1]).children('.sum')[0]).getNumber();
      AutoNumeric.getAutoNumericElement($(li).children('.sum')[0]).set(amount + previousSum);
    }
  }
}

function addRow () {
  const row = $('<li/>');
  makeInputs(row, {
    date: localDate(),
    amount: 100.01,
    payee: ''
  });
  row.appendTo('#sortable');

  initRowEvents(row);
  onChange();
}

function nextMonth () {
  const items = $('#sortable li');
  for (let i = 0; i < items.length; i++) {
    const li = items[i];
    const current = $(li).children('.datepicker').datepicker('getDate');
    const day = current.getDate();
    current.setMonth(current.getMonth() + 1);
    if (current.getDate() !== day) {
      current.setDate(0);
    }
    $(li).children('.datepicker').datepicker('setDate', current);
  }
}

function deleteRow (event) {
  $(event.target.parentElement).remove();

  onChange();
}

var debounce = null;
function save () {
  clearTimeout(debounce);
  debounce = setTimeout(doSave, 100);
}

function doSave () {
  const items = $('#sortable li');
  const data = [];
  for (let i = 0; i < items.length; i++) {
    data[i] = {
      date: $(items[i]).children('.datepicker').val(),
      amount: $(items[i]).children('.amount').val().replace(/[^\d.-]/g, ''),
      payee: $(items[i]).children('.payee').val()
    };
  }

  const backend = getBackendConfig();
  if (backend.url) {
    console.log(`Saving to ${backend.url} with API key ${backend.apiKey}`);

    fetch(backend.url, {
      method: 'PUT',
      headers: {
        'x-api-key': backend.apiKey,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(data)
    })
      .then(response => {
        console.log(`Saved ${data.length} : ${new Date().toLocaleTimeString()}`);
      })
      .catch(error => {
        console.error('Save failed:', error);
        showError('Save failed');
      });
  } else {
    localStorage.setItem('billdata', JSON.stringify(data));
    console.log(`Saved ${data.length} : ${new Date().toLocaleTimeString()}`);
  }
}

function load () {
  const backend = getBackendConfig();
  if (backend.url) {
    console.log(`Fetching from ${backend.url} with API key ${backend.apiKey}`);

    fetch(backend.url, {
      headers: {
        'x-api-key': backend.apiKey,
        Accept: 'application/json; charset=utf-8'
      }
    })
      .then(response => response.json())
      .then(json => {
        populate(json);

        $('#apiUrl').val(backend.url);
        $('#apiKey').val(backend.apiKey);
      })
      .catch(error => {
        console.error('Fetch failed:', error);
        showError('Fetch failed');
      });
  } else {
    console.log('Loading from localStorage');

    if (localStorage.getItem('billdata')) {
      populate(JSON.parse(localStorage.getItem('billdata')));
    }
  }
}

function populate (data) {
  console.log(`populating ${data.length} rows`);

  // defaults
  if (data.length === 0) {
    payees.forEach(function (value) {
      const row = $('<li/>');

      makeInputs(row, {
        date: localDate(),
        amount: 100.01,
        payee: value
      });

      row.appendTo('#sortable');
    });

    save();

  // rebuild from storage
  } else {
    data.forEach(function (value) {
      const row = $('<li/>');

      makeInputs(row, {
        date: value.date,
        amount: value.amount,
        payee: value.payee
      });

      row.appendTo('#sortable');
    });
  }

  initRowEvents();

  doCalc();

  clearLoadingHeader();
}

function clearLoadingHeader () {
  $('#loading').hide();
}

function showError (errorMessage) {
  $('#loading').show().html(`Error: ${errorMessage}`);
}

function initRowEvents (singleRow) {
  $('.datepicker').datepicker(datepickerConfig);
  $('.payee').autocomplete(autocompleteConfig);
  $('.deleteRow').on('click', deleteRow);

  let amountElem = '.amount';
  let sumElem = '.sum';
  if (!singleRow) {
    AutoNumeric.multiple(amountElem, amountConfig);
    AutoNumeric.multiple(sumElem, sumConfig);
  } else {
    amountElem = $(singleRow).children(amountElem)[0];
    AutoNumeric.multiple([amountElem], amountConfig);

    sumElem = $(singleRow).children(sumElem)[0];
    AutoNumeric.multiple([sumElem], sumConfig);
  }
  $(amountElem).on('autoNumeric:rawValueModified', onChange);
  $(sumElem).on('autoNumeric:rawValueModified', onChange);
}

function onChange () {
  doCalc();
  save();
}

function makeInputs (row, options) {
  $('<input/>', {
    size: 6,
    class: 'datepicker',
    value: options.date
  }).appendTo(row);

  let sign = options.amount > 0 ? 'positive' : '';
  sign = options.amount < 0 ? 'negative' : sign;
  $('<input/>', {
    class: `amount money ${sign}`,
    value: options.amount
  }).appendTo(row);

  $('<input/>', {
    class: 'sum money',
    disabled: true
  }).appendTo(row);
  $('<input/>', {
    size: 10,
    class: 'payee',
    value: options.payee
  }).appendTo(row);
  $('<input/>', {
    type: 'button',
    class: 'deleteRow',
    value: 'x'
  }).appendTo(row);
}

function localDate () {
  const local = new Date();
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toJSON().slice(0, 10);
}

function saveToBackend () {
  const backend = {
    url: $('#apiUrl').val(),
    apiKey: $('#apiKey').val()
  };
  localStorage.setItem('backend', JSON.stringify(backend));

  doSave();
}

function loadFromBackend () {
  const backend = {
    url: $('#apiUrl').val(),
    apiKey: $('#apiKey').val()
  };
  localStorage.setItem('backend', JSON.stringify(backend));

  location.reload();
}

function getBackendConfig () {
  const backend = localStorage.getItem('backend');
  return JSON.parse(backend) || {};
}

function clearBackendConfig () {
  localStorage.removeItem('backend');
  doSave();

  location.reload();
}

const datepickerConfig = {
  dateFormat: $.datepicker.ISO_8601
};

const payees = [
  'BASELINE',
  'paycheck',
  'discover',
  'water',
  'verizon',
  'xcel',
  'target',
  'garbage',
  'centerpoint',
  'charter',
  'kohls',
  'sienna',
  'mortgage',
  'braces',
  'investment'
];

const autocompleteConfig = {
  source: payees,
  delay: 0,
  change: onChange
};

const amountConfig = {
  currencySymbol: '$',
  showOnlyNumbersOnFocus: true,
  styleRules: {
    positive: 'positive',
    negative: 'negative'
  }
};

const sumConfig = {
  currencySymbol: '$',
  noEventListeners: true,
  styleRules: {
    ranges: [
      {
        min: 0,
        max: 1000,
        class: 'low'
      }
    ]
  }
};
