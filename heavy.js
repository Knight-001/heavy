let sizeY = process.stdout.columns;
let sizeX = process.stdout.rows;
let rainPer = 0.96;
let msSleep = 200;
let silent = false;
let showRainPer = true;
let seaEnabled = true;
let imgEnabled = true;
let imgOnTop = false;
let logs = false;
let ticks = 0;
let defaultColor = "lb";
let maxItemsInEachLog = 10000;

let f = {}; // Generic functions
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
		/*case "dr":
		case "darkred":
			return "\033[35m";*/
		case "bg":
		case "background":
			return "\033[40m";
		default:
			return "\033[0m";
	}
}

f.printAllColorsDontRunMe = function () {
	for (let x = 0; x < 256; x++) {
		console.log(" - \033[" + x + "m" + x);
	}
	console.log("\033[0m");
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
};

// Logging functions
let l = {
	times: {
		rain: [],
		image: [],
		conv: [],
		frame: [],
		computeLog: []
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
		case "conv":// Conversion overhead
			l.times.conv.push(ts);
			if (l.times.conv.length > maxItemsInEachLog) {
				l.times.conv = l.times.conv.splice(1);
			}
			break;
		case "f":
		case "frame":// Total single frame time
			l.times.frame.push(ts);
			if (l.times.frame.length > maxItemsInEachLog) {
				l.times.frame = l.times.frame.splice(1);
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

l.calcTimings = function (wantString = false) {
	// Times are in ms
	let rain = l.calcSingleTime(l.times.rain);
	let image = l.calcSingleTime(l.times.image);
	let conv = l.calcSingleTime(l.times.conv);
	let log = l.calcSingleTime(l.times.computeLog);
	let frameTime = l.calcSingleTime(l.times.frame);

	if (wantString) {
		return "averageRainComputeTime: \t" + rain.averageComputeTime + "ms\t(on " + rain.loggedItems + " samples)\n" +
			"averageImageComputeTime:\t" + image.averageComputeTime + "ms\t(on " + image.loggedItems + " samples)\n" +
			"averageConvComputeTime:  \t" + conv.averageComputeTime + "ms\t(on " + conv.loggedItems + " samples)\n" +
			"averageLogComputeTime:  \t" + log.averageComputeTime + "ms\t(on " + log.loggedItems + " samples)\n" +
			"averageFrameComputeTime:  \t" + frameTime.averageComputeTime + "ms\t(on " + frameTime.loggedItems + " samples)";
	}
	return {
		averageRainComputeTime: rain.averageComputeTime,
		loggedRainItems: rain.loggedItems,
		averageImageComputeTime: image.averageComputeTime,
		loggedImageItems: image.loggedItems,
		averageConvComputeTime: conv.averageComputeTime,
		loggedConvItems: conv.loggedItems,
		averageLogComputeTime: log.averageComputeTime,
		loggedLogItems: log.loggedItems,
		averageFrameComputeTime: frameTime.averageComputeTime,
		loggedFrameItems: frameTime.loggedItems
	};
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

l.printLogTopLeft = function (screen) {
	let ts = f.getHRTime();
	let timings = l.calcTimings();
	let lines = ["avg rain:  (" + timings.loggedRainItems + ") " + timings.averageRainComputeTime + "ms",
		"avg img:   (" + timings.loggedImageItems + ") " + timings.averageImageComputeTime + "ms",
		"avg conv:  (" + timings.loggedConvItems + ") " + timings.averageConvComputeTime + "ms",
		"avg log:   (" + timings.loggedLogItems + ") " + timings.averageLogComputeTime + "ms",
		"avg frame: (" + timings.loggedFrameItems + ") " + timings.averageFrameComputeTime + "ms"];
	if (screen.length >= 5) {
		for (let y = 0; y < 5; y++) {
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
	l.addLog("cl", f.getHRDifferenceToNow(ts));
	return screen;
}


//Fix text when closing
process.on('SIGINT', function () {
	console.log("\033[0m");
	console.log(l.calcTimings(true));
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
function paintScreen(direction) {
	let ts = f.getHRTime();
	sizeY = process.stdout.columns;
	sizeX = process.stdout.rows;
	let seaLimit = (sizeX > 30) ? f.getMeXPerOf(70, sizeX) : f.getMeXPerOf(80, sizeX);
	let screen = "";
	for (let x = 0; x < sizeX; x++) {
		for (let y = 0; y < sizeY; y++) {
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
	l.addLog("rain", f.getHRDifferenceToNow(ts));
	ts = f.getHRTime();
	// Prepare screen into matrix to avoid computing same thing multiple times for later manipulation
	screen = screen.split("\n");
	for (let x = 0; x < screen.length; x++) {
		screen[x] = screen[x].split("");
	}
	let timeDiff = f.getHRDifferenceToNow(ts);
	if (logs) {
		screen = l.printLogTopLeft(screen);
	}
	screen = superImposeImage(screen);
	ts = f.getHRTime();
	// Putting screen back together to write it
	for (let x = 0; x < screen.length; x++) {
		screen[x] = screen[x].join("");
	}
	screen = screen.join("\n");
	l.addLog("conv", (timeDiff + f.getHRDifferenceToNow(ts)));
	process.stdout.write(screen);
}

async function r() {
	console.log(f.getColor("background") + f.getColor(defaultColor));
	let rainDir = "right";
	while (true) {
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
		paintScreen(rainDir);
		l.addLog("frame", (f.getHRDifferenceToNow(ts)));
		await f.sleep(msSleep);
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
			case "-h":
			case "--help":
				console.log(" --help\t\t[-h]\tonly print this help.\n" +
					" --noperc\t[-np]\thides bottom right number.\n" +
					" --nosea\t[-ns]\tdon't draw sea at screen bottom.\n" +
					" --noimg\t[-ni]\tdon't draw images.\n" +
					" --imageontop\t[-iot]\tdraw images over rain.\n" +
					" --enablelog\t[-el]\tdraw perf stats top left.\n" +
					" -s\t\t\tdon't draw text.");
				process.exit(0);
				break;
		}
	}
	calcEachImageTotalLength();
	r().then();
}

function superImposeImage(screen) {
	if (!imgEnabled) {
		return screen;
	}
	let ts = f.getHRTime();
	let i = img.list[img.showingImage];
	if (img.pos > sizeY) {
		img.pos = -200;
	}
	let offset = img.pos;
	if (offset >= -(i.totalLength)) { // Check if I can draw at least part of the image
		let toInsertAt = (sizeX > 30) ? f.getMeXPerOf(70, sizeX) : f.getMeXPerOf(80, sizeX);
		let colorReset = f.getColor(defaultColor);
		let posToInsert = toInsertAt - i.frames[img.showingFrame].length;
		if ((posToInsert < 0) || (posToInsert > sizeX)) {
			posToInsert = 0;
		}
		i = i.frames[img.showingFrame];
		for (let line of i) {
			let lineToChange = screen[posToInsert];
			for (let x = 0; x < line[1].length; x++) {
				let charCommand = line[1][x];
				let imgChar = charCommand[1];
				let color = f.getColor((charCommand[0] !== "" ? charCommand[0] : defaultColor));
				if ((x + offset + line[0]) <= lineToChange.length) {
					if ((x + offset + line[0] >= 0) && (x + offset + line[0] < sizeY) && (imgChar !== "")) {
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
	if (img.showingFrame >= img.list[img.showingImage].frames.length) {
		img.showingFrame = 0;
	}
	l.addLog("image", f.getHRDifferenceToNow(ts));
	return screen;
}

function calcEachImageTotalLength() {
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
}

checkArgAndStart();
//f.printAllColorsDontRunMe();
