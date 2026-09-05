$(function () {
  $('#sortable').sortable({
    handle: '.dragHandle',
    axis: 'y',
    tolerance: 'pointer',
    distance: 3,
    placeholder: 'rowPlaceholder',
    forcePlaceholderSize: true
  });
  $('#nextMonth').on('click', nextMonth);
  $('#addRow').on('click', addRow);
  $('#sortable').on('sortupdate', onChange);
  $('#sortable').on('click', '.deleteRow', deleteRow);
  $('#save').on('click', saveToBackend);
  $('#load').on('click', loadFromBackend);
  $('#clear').on('click', clearBackendConfig);

  const optionsDialog = document.getElementById('optionsDialog');
  $('#optionsToggle').on('click', function () {
    const backend = getBackendConfig();
    $('#apiUrl').val(backend.url || '');
    $('#apiKey').val(backend.apiKey || '');
    optionsDialog.showModal();
  });
  $('#optionsClose').on('click', function () {
    optionsDialog.close();
  });
  optionsDialog.addEventListener('click', function (event) {
    if (event.target === optionsDialog) {
      optionsDialog.close();
    }
  });

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
  withoutSaving(function () {
    const row = $('<li/>');
    makeInputs(row, {
      date: localDate(),
      amount: 100.01,
      payee: ''
    });
    row.appendTo('#sortable');

    initRowEvents(row);
    doCalc();
  });
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
  $(event.currentTarget).closest('li').remove();

  onChange();
}

var debounce = null;
var suppressSave = false;

function withoutSaving (fn) {
  suppressSave = true;
  try {
    fn();
  } finally {
    suppressSave = false;
  }
}

function save () {
  if (suppressSave) {
    return;
  }
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

    populate(JSON.parse(localStorage.getItem('billdata') || '[]'));
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

const DRAG_HANDLE_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false">' +
  '<circle cx="6" cy="3" r="1.4"/><circle cx="10" cy="3" r="1.4"/>' +
  '<circle cx="6" cy="8" r="1.4"/><circle cx="10" cy="8" r="1.4"/>' +
  '<circle cx="6" cy="13" r="1.4"/><circle cx="10" cy="13" r="1.4"/></svg>';

const TRASH_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>' +
  '<path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>' +
  '<path d="M10 11v6"/><path d="M14 11v6"/></svg>';

function makeInputs (row, options) {
  $('<span/>', {
    class: 'dragHandle',
    'aria-hidden': 'true',
    html: DRAG_HANDLE_SVG
  }).appendTo(row);

  $('<input/>', {
    size: 6,
    class: 'datepicker',
    'aria-label': 'Date',
    value: options.date
  }).appendTo(row);

  let sign = options.amount > 0 ? 'positive' : '';
  sign = options.amount < 0 ? 'negative' : sign;
  $('<input/>', {
    class: `amount money ${sign}`,
    'aria-label': 'Amount',
    value: options.amount
  }).appendTo(row);

  $('<input/>', {
    class: 'sum money',
    'aria-label': 'Running total',
    disabled: true
  }).appendTo(row);
  $('<input/>', {
    size: 10,
    class: 'payee',
    'aria-label': 'Payee',
    value: options.payee
  }).appendTo(row);
  $('<button/>', {
    type: 'button',
    class: 'deleteRow',
    'aria-label': 'Delete row',
    title: 'Delete row',
    html: TRASH_SVG
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

  document.getElementById('optionsDialog').close();
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
    negative: 'negative',
    ranges: [
      {
        min: 0,
        max: 1000,
        class: 'low'
      }
    ]
  }
};
