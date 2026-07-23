// STS Clipart Pro 8.3 — Debug gate loaded before runtime modules.
(function () {
  'use strict';

  var DEBUG_STORAGE_KEY = 'stsDebugEnabled';
  var nativeLog = console.log ? console.log.bind(console) : function () {};
  var nativeInfo = console.info ? console.info.bind(console) : nativeLog;
  var nativeDebug = console.debug ? console.debug.bind(console) : nativeLog;
  var enabled = false;

  function isStsMessage(args) {
    try {
      return Array.prototype.some.call(args, function (value) {
        return typeof value === 'string' && /\bSTS\b|STS Clipart Pro|Clipart Pro/.test(value);
      });
    } catch (_) {
      return false;
    }
  }

  function shouldPrint(args) {
    return enabled || !isStsMessage(args);
  }

  console.log = function () {
    if (shouldPrint(arguments)) nativeLog.apply(null, arguments);
  };

  console.info = function () {
    if (shouldPrint(arguments)) nativeInfo.apply(null, arguments);
  };

  console.debug = function () {
    if (enabled) nativeDebug.apply(null, arguments);
  };

  function setEnabled(nextValue) {
    enabled = !!nextValue;
    window.__STS_DEBUG_ENABLED__ = enabled;
  }

  window.STSDebug = {
    key: DEBUG_STORAGE_KEY,
    isEnabled: function () { return enabled; },
    setEnabled: setEnabled,
    log: function () {
      if (enabled) nativeLog.apply(null, arguments);
    }
  };

  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ stsDebugEnabled: false }, function (result) {
        setEnabled(!!(result && result.stsDebugEnabled));
      });
      chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName !== 'local' || !changes || !changes.stsDebugEnabled) return;
        setEnabled(!!changes.stsDebugEnabled.newValue);
      });
    }
  } catch (_) {
    setEnabled(false);
  }
})();
