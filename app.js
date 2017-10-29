const SERVICE_UUID = "0c4c3000-7700-46f4-aa96-d5e974e32a54";
const LATEST_DATA_CHARACTERISTIC_UUID = "0c4c3001-7700-46f4-aa96-d5e974e32a54";
const LATEST_PAGE_CHARACTERISTIC_UUID = "0c4c3002-7700-46f4-aa96-d5e974e32a54";
const REQUEST_PAGE_CHARACTERISTIC_UUID = "0c4c3003-7700-46f4-aa96-d5e974e32a54";
const RESPONSE_FLAG_CHARACTERISTIC_UUID = "0c4c3004-7700-46f4-aa96-d5e974e32a54";
const RESPONSE_DATA_CHARACTERISTIC_UUID = "0c4c3005-7700-46f4-aa96-d5e974e32a54";

// error-view
let errorView;
let errorMsg;

// connect-view
let connectView;
let connectStatusMsg;
let connectProgressView;
let connectStartDate;
let connectFinishDate;
let connectMode;
let connectBtn;

// debug-view
let debugView;
let debugCount;
let debugProgressBar;
let debugStatusMsg;
let debugUpdateflag;
let debugErrorMsg;
let debugSearchLatestTime;
let debugSearchLatestPage;
let debugSearchLatestRow;
let debugSearchStartTime;
let debugSearchStartPage;
let debugSearchStartRow;
let debugSearchCurrentTime;
let debugSearchCurrentPage;
let debugSearchCurrentRow;
let debugSearchFinishTime;
let debugSearchFinishPage;
let debugSearchFinishRow;

// result-view;
let resultView;

// result_data_view
let resultDataView;

// view init settings
let views = {
  errorView: "d-none",
  connectView: "visible",
  connectProgressView: "d-none",
  debugView: "d-none",
  resultView: "d-none",
  resultDataView: "d-none"
};

function init() {
  // error-view
  errorView = document.querySelector("#error-view");
  errorMsg = document.querySelector("#error-msg");

  // connect-view
  connectView = document.querySelector("#connect-view");
  connectProgressView = document.querySelector("#connect-progress-view");
  connectStatusMsg = document.querySelector("#connect-status-text");
  connectStartDate = document.querySelector("#connect-start-date");
  connectFinishDate = document.querySelector("#connect-finish-date");
  connectMode = document.querySelector("#connect-mode");
  connectBtn = document.querySelector("#connect-btn");
  connectBtn.addEventListener("click", connectBLE);
  
  // debug-view
  debugView = document.querySelector("#debug-view");
  debugCount = document.querySelector("#debug-count");
  debugProgressBar = document.querySelector("#debug-progress");
  debugStatusMsg = document.querySelector("#debug-status-msg");
  debugUpdateflag = document.querySelector("#debug-updateflag");
  debugInterval = document.querySelector("#debug-interval");
  debugErrorMsg = document.querySelector("#debug-error-msg");
  debugSearchLatestTime = document.querySelector("#debug-search-latest-ut");
  debugSearchLatestPage = document.querySelector("#debug-search-latest-page");
  debugSearchLatestRow = document.querySelector("#debug-search-latest-row");
  debugSearchStartTime = document.querySelector("#debug-search-start-ut");
  debugSearchStartPage = document.querySelector("#debug-search-start-page");
  debugSearchStartRow = document.querySelector("#debug-search-start-row");
  debugSearchCurrentTime = document.querySelector("#debug-search-current-ut");
  debugSearchCurrentPage = document.querySelector("#debug-search-current-page");
  debugSearchCurrentRow = document.querySelector("#debug-search-current-row");
  debugSearchFinishTime = document.querySelector("#debug-search-finish-ut");
  debugSearchFinishPage = document.querySelector("#debug-search-finish-page");
  debugSearchFinishRow = document.querySelector("#debug-search-finish-row");
  
  // result-view
  resultView = document.querySelector("#result-view");
  
  // result_data_view
  resultDataView = document.querySelector("#result_data_view");
}

async function connectBLE() {

  try {

    debugStatusMsg.innerHTML = 'Requesting Bluetooth Device...';
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,optionalServices: [SERVICE_UUID]
    });
    connectStatusMsg.innerHTML = "Connecting...";
    connectBtn.disabled=true;
    views.connectProgressView = "visible";
    views.debugView = connectMode.checked ? "visible" : "d-none";
    updateView(views);
    debugProgressBar.setAttribute('style', 'width: 5%;');

    // GATT
    debugStatusMsg.innerHTML = 'Connecting to GATT Server...';
    const server = await device.gatt.connect();
    debugProgressBar.setAttribute('style', 'width: 10%;');
    
    // Primary Service
    debugStatusMsg.innerHTML = 'Getting Omron Service...';
    const service = await server.getPrimaryService(SERVICE_UUID);
    debugProgressBar.setAttribute('style', 'width: 15%;');
    
    // 0x3002 Read Latest page
    debugStatusMsg.innerHTML = 'Read Latest page...';
    const latestpagecharacteristic = await service.getCharacteristic(LATEST_PAGE_CHARACTERISTIC_UUID);
    let lpvalue = await latestpagecharacteristic.readValue();
    debugProgressBar.setAttribute('style', 'width: 20%;');
    
    let c_interval = decodeValue(lpvalue.getUint8(5),lpvalue.getUint8(4), 1);
    let c_latest_page = decodeValue(lpvalue.getUint8(7), lpvalue.getUint8(6), 1);
    let c_latest_row = parseInt(lpvalue.getUint8(8),10);
    let c_latest_ut = ((lpvalue.getUint8(3) << 24) + (lpvalue.getUint8(2) << 16) + (lpvalue.getUint8(1) << 8) + lpvalue.getUint8(0) );
    c_latest_ut -= 32400;
    c_latest_ut += parseInt(c_interval,10) * parseInt(c_latest_row,10);

    let c_start_ut = parseInt(new Date(connectStartDate.value).getTime(),10)/1000;
    let c_finish_ut = parseInt(new Date(connectFinishDate.value).getTime(),10)/1000;

    let c_latest_num = 13*c_latest_page + c_latest_row;
    let c_start_num = c_latest_num - Math.floor( (c_latest_ut - c_start_ut) / c_interval );
    let c_start_page = Math.floor(c_start_num / 13);
    let c_start_row = c_start_num % 13;

    let c_finish_num = c_latest_num - Math.floor( (c_latest_ut - c_finish_ut) / c_interval );
    let c_finish_page = Math.floor(c_finish_num / 13);
    let c_finish_row = c_finish_num % 13;

    let c_step_count = c_finish_num - c_start_num;
    
    let current_page = c_finish_page;
    let current_row = c_finish_row;
    let start_page = c_finish_page; 
    let start_row = c_finish_row;
    let stop_page = c_start_page;
    let stop_row = c_start_row;

    let sensor_data = [];

    debugInterval.innerHTML = c_interval;
    debugSearchLatestTime.innerHTML = new Date(c_latest_ut*1000).toString();
    debugSearchLatestPage.innerHTML = c_latest_page;
    debugSearchLatestRow.innerHTML = c_latest_row;
    debugSearchStartTime.innerHTML = new Date(c_finish_ut*1000).toString();
    debugSearchStartPage.innerHTML = c_finish_page;//start_page;最新から探索するのでstart/finish逆
    debugSearchStartRow.innerHTML = c_finish_row;//start_row;
    debugSearchCurrentTime.innerHTML = new Date(c_finish_ut*1000).toString();
    debugSearchCurrentPage.innerHTML = current_page;
    debugSearchCurrentRow.innerHTML = current_row;
    debugSearchFinishTime.innerHTML = new Date(c_start_ut*1000).toString();
    debugSearchFinishPage.innerHTML = c_start_page;//stop_page;
    debugSearchFinishRow.innerHTML = c_start_row;//stop_row;
    debugProgressBar.setAttribute('style', 'width: 25%;');
    
    let x = 70.0 / parseInt(c_step_count,10);
    let cnt = 0;
    connectStatusMsg.innerHTML = 'Reading... (' + cnt + '/' + c_step_count + ')';
    do {
      debugSearchCurrentPage.innerHTML = current_page;

      // 0x3003 Write Request page
      debugStatusMsg.innerHTML = 'Write Request page...';
      const requestpagecharacteristic = await service.getCharacteristic(REQUEST_PAGE_CHARACTERISTIC_UUID);
      current_row =  ( current_page == start_page ) ? start_row : 12;
      b2 = ( current_page >> 8 ) & 0xff;
      b1 = current_page & 0xff;
      req_data = new Uint8Array([b1, b2, current_row]);
      await requestpagecharacteristic.writeValue(req_data);

      // 0x3004 Read Response flag
      debugStatusMsg.innerHTML = 'Read Response flag...';
      const responseflagcharacteristic = await service.getCharacteristic(RESPONSE_FLAG_CHARACTERISTIC_UUID);
      let rf_updateflag = 0;
      do {
        let rfvalue = await responseflagcharacteristic.readValue();
        rf_updateflag = rfvalue.getUint8(0);
        debugUpdateflag.innerHTML = rf_updateflag;
        if ( rf_updateflag == 2 ) {
          errmsg = "Error - page: " + current_page + ", row: " + current_row;
          debugErrorMsg.innerHTML = errmsg;
          throw new Error(errmsg); 
        }
      } while (rf_updateflag != 1);

      // 0x3005 Read Response data
      debugStatusMsg.innerHTML = 'Read Response data...';
      const responsedatacharacteristic = await service.getCharacteristic(RESPONSE_DATA_CHARACTERISTIC_UUID);
      let row_data = [];
      current_row = 0;
      do {
        let rdvalue = await responsedatacharacteristic.readValue();
        current_row = rdvalue.getUint8(0);
        current_ut = c_finish_ut - (c_interval * cnt);
        let temperature = decodeValue(rdvalue.getUint8(2), rdvalue.getUint8(1), 0.01);
        let humidity = decodeValue(rdvalue.getUint8(4), rdvalue.getUint8(3), 0.01);
        let lumix = decodeValue(rdvalue.getUint8(6), rdvalue.getUint8(5), 1);
        let uv = decodeValue(rdvalue.getUint8(8), rdvalue.getUint8(7), 0.01);
        let atom = decodeValue(rdvalue.getUint8(10), rdvalue.getUint8(9), 0.1);
        let noise = decodeValue(rdvalue.getUint8(12), rdvalue.getUint8(11), 0.01);
        let disco = decodeValue(rdvalue.getUint8(14), rdvalue.getUint8(13), 0.01);
        let heat = decodeValue(rdvalue.getUint8(16), rdvalue.getUint8(15), 0.01);
        let battery = decodeValue(rdvalue.getUint8(18), rdvalue.getUint8(17), 0.001);
        ret=[current_page, current_row, current_ut, temperature, humidity, lumix, uv, atom, noise, disco, heat, battery];
        row_data.push(ret);
        
        connectStatusMsg.innerHTML = 'Reading... (' + cnt + '/' + c_step_count + ')';//c_start_ut;
        debugCount.innerHTML = cnt + " / " + c_step_count;
        debugSearchCurrentTime.innerHTML = new Date(current_ut*1000).toString();
        debugSearchCurrentRow.innerHTML = current_row;
        var par = 25.0 + ( x * cnt );
        debugProgressBar.setAttribute('style', 'width: '+ par +'%;');
        
        cnt++;        
        if ( current_page==stop_page && current_row == stop_row ) {
          break;
        }
      } while (current_row > 0);
      sensor_data.push(row_data);
      current_page--;
    } while ( current_page >= stop_page );
    debugProgressBar.setAttribute('style', 'width: 95%;');
    
    // 0x3005
    debugStatusMsg.innerHTML = 'View Result Graph...';
    showTable("result_data_body", sensor_data);
    showGraph(sensor_data);
    debugProgressBar.setAttribute('style', 'width: 100%;');
    views.connectView = "d-none";
    views.connectProgressView = "d-none";
    views.debugView = "d-none"
    views.resultView = "visible";
    views.resultDataView = connectMode.checked ? "visible" : "d-none";
    updateView(views);
    debugStatusMsg.innerHTML = 'Finished!';
    
  } catch(error) {    
    debugErrorMsg.innerHTML = error;
    errorMsg.innerHTML = error;
    updateView(views, 1);
  }
}


function showTable(id, data) {
  var tbody = document.getElementById(id);
  for (let page of data) {
    for (let row of page) {
      var tr = document.createElement("tr");
      for (let d of row) {
        var td = document.createElement("td");
        td.innerHTML = Number.isInteger(d) ? d : d.toFixed(2);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
}

function showGraph(data) {
  let l = [];
  let time = [];
  let temp = [];
  let hum = [];
  let lux = [];
  let uv = [];
  let atom = [];
  let noise = [];
  let disco = [];
  let heat = [];
  let battery = [];
  let num = 0;
  for (let page of data) { // data[page][row][0-4]
    for (let row of page) { // pate[row][0-4]
      l.push(num);
      time.push(new Date(row[2]*1000).toISOString());
      temp.push(row[3]);
      hum.push(row[4]);
      lux.push(row[5]);
      uv.push(row[6]);
      atom.push(row[7]);
      noise.push(row[8]);
      disco.push(row[9]);
      heat.push(row[10]);
      battery.push(row[11]);
      num++;
    }
  }
  createGraph("myChart1", "Temp", l, temp.reverse());
  createGraph("myChart2", "Hum", l, hum.reverse());
  createGraph("myChart3", "Lux", l, lux.reverse());
  createGraph("myChart4", "UV", l, uv.reverse());
  createGraph("myChart5", "Atom", l, atom.reverse());
  createGraph("myChart6", "Noise", l, noise.reverse());
  createGraph("myChart7", "Bat", l, battery.reverse());
}


function createGraph(g_id, g_label, g_x, g_y){
  new Chart(document.getElementById(g_id).getContext('2d'), {
    type: 'line',
    data: {
      labels: g_x,
      datasets: [{
        label: g_label,
        data: g_y,
      }]
    }, 
    options: {
      responsive: true,
    }
  });
}

function decodeValue(msb, lsb, gain){
  return ((msb << 8) + lsb) * gain
}

function updateView(view, all) {
  
  if(all||0) {
    for(let p in view) {
      view[p] = "visible";
    }
  }
  
  connectView.className = view.connectView;
  errorView.className = view.errorView;
  connectProgressView.className = view.connectProgressView;
  debugView.className = view.debugView;
  resultView.className = view.resultView;
  resultDataView.className = view.resultDataView;

}

window.addEventListener("load", init);