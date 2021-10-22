let sizeY = process.stdout.columns;
let sizeX = process.stdout.rows;
let rainPer = 0.96;
let msSleep = 200;
let silent = false;
let showRainPer = true;
let seaEnabled = true;
let imgEnabled = true;
let ticks = 0;
let defaultColor = "lb";

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
//Generic functions

//Fix text when closing
process.on('SIGINT', function () {
	console.log("\033[0m");
	process.exit(0);
});

let img = {};
img.pos = -15;
img.showingImage = 0;
img.showingFrame = 0;
img.list = [{
	name: "boat",
	totalLength: 0,
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
function paintScreen(direction, addDir) {
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
		let toAdd = (addDir === "up") ? "↑" : "↓";
		if (showRainPer) {
			toAdd += rainPer;
		}
		toAdd += " ";
		screen = screen.substring(0, ((screen.length - toAdd.toString().length) - 1)) +
			"\033[33m" + toAdd + "\033[34m";
	}
	screen = superImposeImage(screen);
	process.stdout.write(screen);
}

async function r() {
	//console.log('\033[40m\033[34mTerminal size: ' + sizeY + 'x' + sizeX);
	console.log(f.getColor("background") + f.getColor(defaultColor));
	//let step = 0;
	let rainDir = "right";
	let addDir = "down";
	while (true) {
		if (ticks >= 10) {
			if (addDir === "down") {
				rainPer = f.roundTo3(rainPer - 0.001);
			} else {
				rainPer = f.roundTo3(rainPer + 0.001);
			}
			ticks = 0;
		}
		if (rainPer > 0.97) {
			addDir = "down";
			rainDir = "right";
		} else if (rainPer < 0.85) {
			addDir = "up";
			rainDir = "left";
		}
		ticks++;
		paintScreen(rainDir, addDir, ticks);
		await f.sleep(msSleep);
	}
}

function checkArgAndStart() {
	for (let a of process.argv) {
		switch (a) {
			case "--noperc":
				showRainPer = false;
				break;
			case "-s":
				silent = true;
				break;
			case "--nosea":
				seaEnabled = false;
				break;
			case "--noimg":
				imgEnabled = false;
				break;
			case "-h":
			case "--help":
				console.log(" --noperc hides bottom right number.\n" +
					" --nosea don't draw sea at screen bottom.\n" +
					" --noimg don't draw images.\n" +
					" -s draw only rain");
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
	{
		let i = img.list[img.showingImage];
		if (img.pos > sizeY) {
			img.pos = -200;
		}
		let offset = img.pos;
		if (offset < -(i.totalLength)) {
			if (ticks % 2 === 0) {
				img.pos++;
			}
			return screen;
		}
		let scr = screen.split("\n");
		let toInsertAt = (sizeX > 30) ? f.getMeXPerOf(70, sizeX) : f.getMeXPerOf(80, sizeX);
		let colorReset = f.getColor(defaultColor);
		let posToInsert = toInsertAt - i.frames[img.showingFrame].length;
		if ((posToInsert < 0) || (posToInsert > sizeX) || (posToInsert > scr.length)) {
			posToInsert = 0;
		}
		i = i.frames[img.showingFrame];
		for (let line of i) {
			let lineToChange = scr[posToInsert].split("");
			for (let x = 0; x < line[1].length; x++) {
				let charCommand = line[1][x];
				let imgChar = charCommand[1];
				let color = f.getColor((charCommand[0] !== "" ? charCommand[0] : defaultColor));
				if ((x + offset + line[0]) <= lineToChange.length) {
					if ((x + offset + line[0] >= 0) && (x + offset + line[0] < sizeY) && (imgChar !== "")) {
						if ((lineToChange[x + offset + line[0]] === "") || (lineToChange[x + offset + line[0]] === " ")) {
							lineToChange[x + offset + line[0]] = color + imgChar + colorReset;
						}
					}
				}
			}
			scr[posToInsert] = lineToChange.join("");
			posToInsert++;
		}
		screen = scr.join("\n");
	}
	if (ticks % 2 === 0) {
		img.pos++;
	}
	img.showingFrame++;
	if (img.showingFrame >= img.list[img.showingImage].frames.length) {
		img.showingFrame = 0;
	}
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
