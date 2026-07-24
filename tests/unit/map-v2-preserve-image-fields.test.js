const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('content_modules/clipart/scanner-auto.js', 'utf8');
const sandbox = { window: { STSClipartScanner: {} }, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const map = sandbox.window.STSClipartScanner.modules.auto.__mapV2GroupsToCategoriesForTest;
const out = map([{
  label: "Man's Hair Color",
  options: [{
    capturedImage: 'data:image/png;base64,123',
    imageUrl: null,
    bgColor: '#111111',
    optionType: 'image',
    sourceKind: 'customily-swatch',
    textContent: 'black',
    value: 'black',
    name: 'black'
  }]
}]);

assert.equal(out[0].options[0].capturedImage, 'data:image/png;base64,123');
assert.equal(out[0].options[0].imageUrl, null);
assert.equal(out[0].options[0].optionType, 'image');
assert.equal(out[0].options[0].sourceKind, 'customily-swatch');
assert.equal(out[0].options[0].bgColor, '#111111');
assert.equal(out[0].options[0].textContent, 'black');
assert.equal(out[0].options[0].value, 'black');
assert.equal(out[0].options[0].name, 'black');

console.log('map v2 preserve image fields test passed.');

const visualOut = map([{ label:'Body Type', options:[{ textContent:'YOUNG', value:'YOUNG', name:'Body Type', optionType:'visual-text', sourceKind:'customily-swatch', hasVisual:true, needsCapture:true, visualKind:'tile', classificationReason:'customily-swatch-text-tile', imageUrl:null, capturedImage:null }] }]);
assert.equal(visualOut[0].options[0].capturedImage, null);
assert.equal(visualOut[0].options[0].optionType, 'visual-text');
assert.equal(visualOut[0].options[0].needsCapture, true);


const textInputOut = map([{ label:'Custom Name', options:[{ textContent:'Custom Name', value:'', name:'properties[Custom Name]', optionType:'text', sourceKind:'text-input', imageUrl:null, capturedImage:null }] }]);
assert.equal(textInputOut[0].options[0].optionKind, 'text');
assert.equal(textInputOut[0].options[0].originalOptionKind, 'text');
assert.equal(textInputOut[0].options[0].displayKind, 'text');
