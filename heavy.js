const {Worker, isMainThread, parentPort, workerData} = require('worker_threads');
// Don't need workerData rn but I might use it later idk.

// Generic functions are shared
let f = {};
f.sleep = function (millis) {
	return new Promise(resolve => setTimeout(resolve, millis));
}

f.roundTo3 = function (val) {
	return Math.round(val * 1000) / 1000;
}

f.getMeXPerOf = function (perc, of) {
	return Math.round(((of * perc) / 100));
}

f.getColor = function (c = "") {
	switch (c) {
		case "r":
		case "red":
			return "\033[31m";
		case "w":
		case "white":
			return "\033[97m";
		case "g":
		case "green":
			return "\033[32m";
		case "o":
		case "orange":
			return "\033[33m";
		case "lb":
		case "lightblue":
			return "\033[34m";
		case "dg":
		case "darkgreen":
			return "\033[36m";
		case "y":
		case "yellow":
			return "\033[93m";
		case "bg":
		case "background":
			return "\033[40m";
		default:
			return "\033[0m";
	}
}

f.printAllColorsDontRunMe = function () {
	for (let x = 0; x < 256; x++) {
		console.log(" - \033[" + x + "m" + x + "\033[0m");
	}
	process.exit(0);
}

f.getHRTime = function () {
	let hr = process.hrtime();
	// Seconds000000.000
	return (hr[0] * 1000000) + (hr[1] / 1000);
}

f.getHRDifferenceToNow = function (ts) {
	let now = f.getHRTime();
	let diff = now - ts;
	diff = (Math.round(diff * 100) / 100000);
	return diff;
}

f.roundWithXZeroes = function (number, decimals) {
	let n = "1";
	while (decimals > 0) {
		n += "0";
		decimals--;
	}
	n = parseInt(n);
	return (Math.round(number * n) / n);
}

f.randomIntFromInterval = function (min, max) {
	// min and max included
	return Math.floor(Math.random() * (max - min + 1) + min);
};

f.calcEachImageTotalLength = function (img, array = true) {
	// If img is not an array, calc and return it's length, using it to compute thunders created on the fly.
	if (array) {
		for (let x = 0; x < img.list.length; x++) {
			let maxLength = 0;
			let i = img.list[x];
			for (let frames of i.frames) {
				for (let c of frames) {
					let lineLength = c[0] + c[1].length;
					if (maxLength < lineLength) {
						maxLength = lineLength;
					}
				}
			}
			img.list[x].totalLength = maxLength;
		}
		return img;
	} else {
		let maxLength = 0;
		for (let frames of img.frames) {
			for (let c of frames) {
				let lineLength = c[0] + c[1].length;
				if (maxLength < lineLength) {
					maxLength = lineLength;
				}
			}
		}
		return maxLength;
	}
}

let defaultColor = "lb";
let thunderColor = "white";
let thunderMax = 5;

if (isMainThread) {
	let sizeX = process.stdout.columns;
	let sizeY = process.stdout.rows;
	let rainPer = 0.96;
	let msSleep = 200;
	let silent = false;
	let showRainPer = true;
	let seaEnabled = true;
	let imgEnabled = true;
	let imgOnTop = false;
	let logs = false;
	let ticks = 0;
	let workers = {
		kaminariNoShihaisha: false,
		kaminariNoData: false,
		logger: false,
		loggerData: false
	}
	let cachedLogs = [];

	function addLogToCache(type, ts) {
		cachedLogs.push({type: type, ts: ts});
	}

	function printLogTopLeft(screen) {
		if (workers.loggerData === false) {
			return screen;
		}
		let ts = f.getHRTime();
		let timings = workers.loggerData.obj;
		let lines = ["avg rain:  (" + timings.loggedRainItems + ") " + timings.averageRainComputeTime + "ms",
			"avg img:   (" + timings.loggedImageItems + ") " + timings.averageImageComputeTime + "ms",
			"avg conv:  (" + timings.loggedConvItems + ") " + timings.averageConvComputeTime + "ms",
			"avg log:   (" + timings.loggedLogItems + ") " + timings.averageLogComputeTime + "ms",
			"avg thu-c: (" + timings.loggedThunderComputeItems + ") " + timings.averageThunderComputeTime + "ms",
			"avg thu-t: (" + timings.loggedThunderTotalItems + ") " + timings.averageThunderTotalTime + "ms",
			"avg frame: (" + timings.loggedFrameItems + ") " + timings.averageFrameComputeTime + "ms"];
		if (screen.length >= lines.length) {
			for (let y = 0; y < lines.length; y++) {
				let line = screen[y];
				lines[y] = lines[y].split("");
				for (let x = 0; x < lines[y].length; x++) {
					if (x < line.length) {
						line[x] = lines[y][x];
					}
				}
				screen[y] = line;
			}
		}
		addLogToCache("cl", f.getHRDifferenceToNow(ts));
		return screen;
	}

	//Fix text when closing
	process.on('SIGINT', function () {
		console.log("\033[0m");
		console.log(workers.loggerData.str);
		console.log("'Thunder compute'\t(thu-c) time is calculated in a worker thread, not in the main one.\n" +
			"'Thunder total'\t\t(thu-t) is the full time the request took from main thread asking for thunder to worker thread delivering the data.");
		process.exit(0);
	});

	let img = {};
	img.pos = -15;
	img.showingImage = 0;
	img.showingFrame = 0;
	img.list = [{
		name: "boat",
		totalLength: 0,// length computed at startup
		frames: [[
			[5, [["w", "."]]],
			[4, [["o", "/"], ["o", "|"]]],
			[3, [["o", "/"], ["", ""], ["o", "|"]]],
			[2, [["o", "/"], ["r", "_"], ["r", "_"], ["o", "|"], ["r", "_"], ["r", "_"]]],
			[0, [["r", "\\"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "/"]]]
		], [
			[4, [["w", "\\"], ["", ""], ["w", "/"]]],
			[3, [["w", "-"], ["", ""], ["w", "."], ["", ""], ["w", "-"]]],
			[4, [["o", "/"], ["o", "|"]]],
			[3, [["o", "/"], ["", ""], ["o", "|"]]],
			[2, [["o", "/"], ["r", "_"], ["r", "_"], ["o", "|"], ["r", "_"], ["r", "_"]]],
			[0, [["r", "\\"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "-"], ["r", "/"]]]
		]]
	}];

	//Paint single frame
	function calculateFrame(direction) {
		let ts = f.getHRTime();
		sizeX = process.stdout.columns;
		sizeY = process.stdout.rows;
		let seaLimit = (sizeY > 30) ? f.getMeXPerOf(70, sizeY) : f.getMeXPerOf(80, sizeY);
		let screen = "";
		for (let x = 0; x < sizeY; x++) {
			for (let y = 0; y < sizeX; y++) {
				if ((x >= seaLimit) && (seaEnabled)) {
					let symbols = ["/", "\\"];
					if (ticks % 2 === 0) {
						symbols = ["\\", "/"];
					}
					if (y % 2 === 0) {
						screen += symbols[0];
					} else {
						screen += symbols[1];
					}
				} else {
					if (Math.random() > rainPer) {
						if (direction === "right") {
							if (Math.random() > 0.8) {
								screen += ",";
							} else {
								screen += "/";
							}
						} else {
							if (Math.random() > 0.8) {
								screen += "'";
							} else {
								screen += "\\";
							}
						}
					} else {
						screen += " ";
					}
				}
			}
			screen += "\n";
		}
		if (!silent) {
			let toAdd = (direction === "left") ? "↑" : "↓";
			if (showRainPer) {
				toAdd += rainPer;
			}
			toAdd += " ";
			screen = screen.substring(0, ((screen.length - toAdd.toString().length) - 1)) +
				"\033[33m" + toAdd + "\033[34m";
		}
		addLogToCache("rain", f.getHRDifferenceToNow(ts));
		ts = f.getHRTime();
		// Prepare screen into matrix to avoid computing same thing multiple times for later manipulation
		screen = screen.split("\n");
		for (let x = 0; x < screen.length; x++) {
			screen[x] = screen[x].split("");
		}
		let timeDiff = f.getHRDifferenceToNow(ts);
		if (logs) {
			screen = printLogTopLeft(screen);
		}
		screen = superImposeImage(screen, img.list[0]);
		if (workers.kaminariNoData.thunder) {
			screen = superImposeThunder(screen, workers.kaminariNoData.thunders);
		}
		ts = f.getHRTime();
		// Putting screen back together to write it
		for (let x = 0; x < screen.length; x++) {
			screen[x] = screen[x].join("");
		}
		screen = screen.join("\n");
		addLogToCache("conv", (timeDiff + f.getHRDifferenceToNow(ts)));
		return screen;
	}

	async function r() {
		let rainDir = "right";
		let frame = f.getColor("background") + f.getColor(defaultColor) + "\n";
		while (true) {
			let toWaitFor = f.sleep(msSleep);// Let's try to always keep the frames on time.
			process.stdout.write(frame);
			if (ticks >= 10) {
				if (rainDir === "right") {
					rainPer = f.roundTo3(rainPer - 0.001);
				} else {
					rainPer = f.roundTo3(rainPer + 0.001);
				}
				ticks = 0;
			}
			if (rainPer > 0.97) {
				rainDir = "right";
			} else if (rainPer < 0.85) {
				rainDir = "left";
			}
			ticks++;
			let ts = f.getHRTime();
			frame = calculateFrame(rainDir);
			addLogToCache("frame", (f.getHRDifferenceToNow(ts)));
			askForNewThunder(); // Moved here to allow the thread to work in main's off-time.
								// This will ensure main process always has fresh data
								// since threads data exchange seems to take so much time.
			flushLogCacheToThread();
			await toWaitFor;
		}
	}

	function checkArgAndStart() {
		for (let a of process.argv) {
			switch (a) {
				case "-s":
					silent = true;
					break;
				case "-np":
				case "--noperc":
					showRainPer = false;
					break;
				case "-ns":
				case "--nosea":
					seaEnabled = false;
					break;
				case "-ni":
				case "--noimg":
					imgEnabled = false;
					break;
				case "-iot":
				case "--imageontop":
					imgOnTop = true;
					break;
				case "-el":
				case "--enablelog":
					logs = true;
					break;
				case "-yt":
				case "--yellowthunders":
					thunderColor = "yellow";
					break;
				case "-h":
				case "--help":
					console.log(" --help\t\t\t[-h]\tonly print this help.\n" +
						" --noperc\t\t[-np]\thides bottom right number.\n" +
						" --nosea\t\t[-ns]\tdon't draw sea at screen bottom.\n" +
						" --noimg\t\t[-ni]\tdon't draw images.\n" +
						" --imageontop\t\t[-iot]\tdraw images over rain.\n" +
						" --enablelog\t\t[-el]\tdraw perf stats top left.\n" +
						" --yellowthunders\t[-yt]\tdraw yellow thunders instead of white.\n" +
						" --maxthunders=x\t[-mt=]\tset max thunders to draw at one time (def: 5).\n" +
						" -s\t\t\t\tdon't draw text.");
					process.exit(0);
					break;
				default:
					if ((a.startsWith("--maxthunders=")) || (a.startsWith("-mt="))) {
						try {
							if (a.startsWith("-mt=")) {
								a = a.substring(4);
							} else {
								a = a.substring(14);
							}
							a = parseInt(a);
							if (a > 0) {
								thunderMax = a;
							}
						} catch (e) {
							thunderMax = 5;
						}
					}
					break;
			}
		}
		enableLoggerThread().then();
		enableKaminariNoShihaisha().then();
		img = f.calcEachImageTotalLength(img); // I could write it but I didn't feel like it
		// Setting up a bit of delay to allow worker thread to be ready for requests.
		setTimeout(function () {
			r().then();
		}, 100);
	}

	function superImposeImage(screen, image) {
		if (!imgEnabled) {
			return screen;
		}
		let ts = f.getHRTime();
		//let i = img.list[img.showingImage];
		if (img.pos > sizeX) {
			img.pos = -200;
		}
		let offset = img.pos;
		if (offset >= -(image.totalLength)) { // Check if I can draw at least part of the image
			let toInsertAt = (sizeY > 30) ? f.getMeXPerOf(70, sizeY) : f.getMeXPerOf(80, sizeY);
			let colorReset = f.getColor(defaultColor);
			let posToInsert = toInsertAt - image.frames[img.showingFrame].length;
			if ((posToInsert < 0) || (posToInsert > sizeY)) {
				posToInsert = 0;
			}
			let i = image.frames[img.showingFrame];
			for (let line of i) {
				let lineToChange = screen[posToInsert];
				for (let x = 0; x < line[1].length; x++) {
					let charCommand = line[1][x];
					let imgChar = charCommand[1];
					let color = f.getColor((charCommand[0] !== "" ? charCommand[0] : defaultColor));
					if ((x + offset + line[0]) <= lineToChange.length) {
						if ((x + offset + line[0] >= 0) && (x + offset + line[0] < sizeX) && (imgChar !== "")) {
							if (
								(lineToChange[x + offset + line[0]] === "") ||
								(lineToChange[x + offset + line[0]] === " ") ||
								(imgOnTop)
							) {
								lineToChange[x + offset + line[0]] = color + imgChar + colorReset;
							}
						}
					}
				}
				screen[posToInsert] = lineToChange;
				posToInsert++;
			}
		}
		if (ticks % 2 === 0) {
			// Move image every other frame
			img.pos++;
		}
		img.showingFrame++;
		if (img.showingFrame >= image.frames.length) {
			img.showingFrame = 0;
		}
		addLogToCache("image", f.getHRDifferenceToNow(ts));
		return screen;
	}

	function superImposeThunder(screen, thunders) {
		for (let t of thunders) {
			screen[t.y][t.x] = t.c;
		}
		return screen;
	}

	async function enableKaminariNoShihaisha() {
		return new Promise(async (resolve) => {
			try {
				workers.kaminariNoShihaisha = new Worker(__filename);
				workers.kaminariNoShihaisha.on('message', parseKaminariData);
				workers.kaminariNoShihaisha.on('error', function (err) {
					restartKaminari(err);
				});
				workers.kaminariNoShihaisha.on('exit', (code) => {
					if (code !== 0) {
						throw new Error("KaminariNoShihaisha stopped with exit code " + code);
					}
				});
				resolve(true);
				askToKNS({todo: "opts", thunderMax: thunderMax, thunderColor: thunderColor});
			} catch (e) {
				console.log(e);
				//restartKaminari(e);
			}
		});
	}

	async function enableLoggerThread() {
		return new Promise(async (resolve) => {
			try {
				workers.logger = new Worker(__filename);
				workers.logger.on('message', parseLoggerData);
				workers.logger.on('error', function (err) {
					restartLogger(err);
				});
				workers.logger.on('exit', (code) => {
					if (code !== 0) {
						throw new Error("Logger stopped with exit code " + code);
					}
				});
				resolve(true);
			} catch (e) {
				console.log(e);
			}
		});
	}

	function parseKaminariData(data) {
		addLogToCache("tt", f.getHRDifferenceToNow(data.ts));
		addLogToCache("ttc", data.took);
		workers.kaminariNoData = data;
	}

	function parseLoggerData(data) {
		workers.loggerData = data;
	}

	function restartKaminari(error) {
		if (error) {
			console.log(error);
			workers.kaminariNoShihaisha = false;
			enableKaminariNoShihaisha().then();
		}
	}

	function restartLogger(error) {
		if (error) {
			console.log(error);
			workers.logger = false;
			enableLoggerThread().then();
		}
	}

	function askForNewThunder() {
		// Worker thread can't get to process.stdout directly to get the sizes itself
		askToKNS({todo: "thunder", ts: f.getHRTime(), sizeY: sizeY, sizeX: sizeX});
	}

	function askToKNS(data) {
		workers.kaminariNoShihaisha.postMessage(data);
	}

	function flushLogCacheToThread() {
		askToLogger({todo: "loggerAddLogs", logs: cachedLogs});
		cachedLogs = [];
	}

	function calcTimings() {
		askToLogger({todo: "loggerCalcTimings"});
	}

	function askToLogger(data) {
		workers.logger.postMessage(data);
	}

	checkArgAndStart();
	//f.printAllColorsDontRunMe();
} else {
	parentPort.on('message', (message) => {
		if (message.todo === "thunder") {
			let ts = f.getHRTime();
			let resp = {
				ts: message.ts,
				took: 0,
				thunder: false,
				thunders: []
			}
			if (Math.random() > 0.9) {
				resp.thunder = true;
				resp.thunders = computeThunders(message);
			}
			resp.took = f.getHRDifferenceToNow(ts);
			parentPort.postMessage(resp);
		} else if (message.todo.startsWith("logger")) {
			let todo = message.todo.substring(6);
			switch (todo) {
				case "CalcTimings":
					parentPort.postMessage(l.calcTimings());
					break;
				case "AddLogs":
					for (let log of message.logs) {
						l.addLog(log.type, log.ts);
					}
					parentPort.postMessage(l.calcTimings());
					break;
			}
		} else if (message.todo === "opts") {
			if (message.hasOwnProperty("thunderMax")) {
				thunderMax = message.thunderMax;
			}
			if (message.hasOwnProperty("thunderColor")) {
				thunderColor = message.thunderColor;
				color = f.getColor(thunderColor);
				thunderParts = [color + "/" + colorReset, color + "\\" + colorReset];
			}
		}
	});

	//KaminariNoShihaisha
	let colorReset = f.getColor(defaultColor);
	let color = f.getColor(thunderColor);
	let thunderParts = [color + "/" + colorReset, color + "\\" + colorReset];

	function computeThunders(message) {
		let sizeX = message.sizeX;
		let sizeY = message.sizeY;
		let thunders = [];
		let seaLimit = (sizeY > 30) ? f.getMeXPerOf(70, sizeY) : f.getMeXPerOf(80, sizeY);
		for (let t = 0; t < f.randomIntFromInterval(1, thunderMax); t++) {
			let lastX = f.randomIntFromInterval(0, sizeX - 1);
			for (let y = 0; y < seaLimit; y++) {
				let nextId = (f.randomIntFromInterval(0, 1) === 0 ? -1 : 1);
				let toDraw = "";
				if (lastX === 0) {
					nextId = 1;
				} else if (lastX >= (sizeX - 1)) {
					nextId = -1;
				}
				if (nextId === 1) {
					toDraw = thunderParts[1];
				} else {
					toDraw = thunderParts[0];
				}
				lastX += nextId;
				thunders.push({x: lastX, y: y, c: toDraw});
			}
		}
		return thunders;
	}


	let maxItemsInEachLog = 10000;
	// Logger
	let l = {
		times: {
			rain: [],
			image: [],
			conv: [],
			frame: [],
			computeLog: [],
			thunderCompute: [],
			thunder: [],
		}
	};

	l.addLog = function (type, ts) {
		switch (type) {
			case "r":
			case "rain": // Time used to calculate full screen worth of rain and sea
				l.times.rain.push(ts);
				if (l.times.rain.length > maxItemsInEachLog) {
					l.times.rain = l.times.rain.splice(1);
				}
				break;
			case "i":
			case "image": // Time used to write the images from img.list on the screen
				l.times.image.push(ts);
				if (l.times.image.length > maxItemsInEachLog) {
					l.times.image = l.times.image.splice(1);
				}
				break;
			case "c":
			case "conv": // Conversion overhead
				l.times.conv.push(ts);
				if (l.times.conv.length > maxItemsInEachLog) {
					l.times.conv = l.times.conv.splice(1);
				}
				break;
			case "f":
			case "frame": // Total single frame time
				l.times.frame.push(ts);
				if (l.times.frame.length > maxItemsInEachLog) {
					l.times.frame = l.times.frame.splice(1);
				}
				break;
			case "tt":
			case "thunder": // Total thread thunder compute time ( compute time + sending & getting data from thread )
				l.times.thunder.push(ts);
				if (l.times.thunder.length > maxItemsInEachLog) {
					l.times.thunder = l.times.thunder.splice(1);
				}
				break;
			case "ttc":
			case "thunderCompute": // Only thunder compute time ( no sending & getting data from thread )
				l.times.thunderCompute.push(ts);
				if (l.times.thunderCompute.length > maxItemsInEachLog) {
					l.times.thunderCompute = l.times.thunderCompute.splice(1);
				}
				break;
			case "cl":
			case "computeLog": // Total time used on calculating onscreen logs if enabled
				l.times.computeLog.push(ts);
				if (l.times.computeLog.length > maxItemsInEachLog) {
					l.times.computeLog = l.times.computeLog.splice(1);
				}
				break;
		}
	}

	l.calcTimings = function () {
		// Times are in ms
		let rain = l.calcSingleTime(l.times.rain);
		let image = l.calcSingleTime(l.times.image);
		let conv = l.calcSingleTime(l.times.conv);
		let log = l.calcSingleTime(l.times.computeLog);
		let frameTime = l.calcSingleTime(l.times.frame);
		let thunderCompute = l.calcSingleTime(l.times.thunderCompute);
		let thunder = l.calcSingleTime(l.times.thunder);

		return {
			str: "averageRainComputeTime: \t" + rain.averageComputeTime + "ms\t(on " + rain.loggedItems + " samples)\n" +
				"averageImageComputeTime:\t" + image.averageComputeTime + "ms\t(on " + image.loggedItems + " samples)\n" +
				"averageConvComputeTime:  \t" + conv.averageComputeTime + "ms\t(on " + conv.loggedItems + " samples)\n" +
				"averageLogComputeTime:  \t" + log.averageComputeTime + "ms\t(on " + log.loggedItems + " samples)\n" +
				"averageThunderComputeTime:  \t" + thunderCompute.averageComputeTime + "ms\t(on " + thunderCompute.loggedItems + " samples)\n" +
				"averageThunderTotalTime:  \t" + thunder.averageComputeTime + "ms\t(on " + thunder.loggedItems + " samples)\n" +
				"averageFrameComputeTime:  \t" + frameTime.averageComputeTime + "ms\t(on " + frameTime.loggedItems + " samples)",
			obj: {
				averageRainComputeTime: rain.averageComputeTime,
				loggedRainItems: rain.loggedItems,
				averageImageComputeTime: image.averageComputeTime,
				loggedImageItems: image.loggedItems,
				averageConvComputeTime: conv.averageComputeTime,
				loggedConvItems: conv.loggedItems,
				averageLogComputeTime: log.averageComputeTime,
				loggedLogItems: log.loggedItems,
				averageThunderComputeTime: thunderCompute.averageComputeTime,
				loggedThunderComputeItems: thunderCompute.loggedItems,
				averageThunderTotalTime: thunder.averageComputeTime,
				loggedThunderTotalItems: thunder.loggedItems,
				averageFrameComputeTime: frameTime.averageComputeTime,
				loggedFrameItems: frameTime.loggedItems
			}
		}
	}

	l.calcSingleTime = function (thingToCompute) {
		let averageComputeTime = 0;
		let loggedItems = thingToCompute.length;
		for (let i of thingToCompute) {
			averageComputeTime += i;
		}
		// First time it will output NaN as there are no logged items, it's acceptable since the alternatives would be
		// to implement a check slowing down the processing
		averageComputeTime = f.roundWithXZeroes(averageComputeTime / loggedItems, 6);
		return {averageComputeTime: averageComputeTime, loggedItems: loggedItems};
	}

}
