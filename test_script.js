const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = `<!DOCTYPE html><html><body><canvas id="shapeCanvas" width="500" height="500"></canvas><canvas id="fssChart"></canvas><input id="fStart_num" value="20.0"><input id="fEnd_num" value="35.0"><input id="p_num" value="4.1"><input id="a_num" value="3.25"><input id="b_num" value="0.6"><input id="s_num" value="1.0"><input id="h_sub_num" value="0.508"><input id="er_num" value="2.94"><input id="er_eff_num" value=""><div id="val_XL"></div><div id="val_BC1"></div><div id="val_BC2"></div><div id="val_erEff"></div><div id="val_L_total"></div><div id="val_C_total"></div></body></html>`;

const dom = new JSDOM(html, { runScripts: 'dangerously' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = { userAgent: 'node.js' };
global.Chart = class { constructor() {} destroy() {} };

import('file:///' + process.cwd().replace(/\\/g, '/') + '/src/js/topologies/ui_estrela4pontas.js')
  .then(async m => {
    try {
      const event = document.createEvent('Event');
      event.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(event);
      await new Promise(r => setTimeout(r, 100));
      console.log('Test completed successfully');
    } catch (e) {
      console.error('ERROR OCCURRED:', e);
    }
  })
  .catch(e => {
    console.error('MODULE LOAD ERROR:', e);
  });
