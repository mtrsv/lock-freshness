const fs = require('fs');
const lockfile = require('@yarnpkg/lockfile');
const axios = require('axios');

const LOCK_FILE_PATH = 'yarn.lock';
const CACHE_FILE_PATH = "cache.txt";
const DAYS_DIFF_MIN = 150;

main();

async function main() {
	const file = fs.readFileSync(LOCK_FILE_PATH, 'utf8');
	const lockfileJson = lockfile.parse(file);
	
	const packageTimeData = loadCache();

	const packageVersionData = getVerisons(lockfileJson, packageTimeData);
	
	const packagesNames = Object.keys(packageTimeData); 
	console.log("Packages found:", packagesNames.length);

	await getPackagesData(packagesNames, packageTimeData);
	
	printFreshPackages(packageVersionData, packageTimeData);
}

function getVerisons (lockfileJson, packageTimeData) {
	const packageVersionData = {};
	Object.keys(lockfileJson.object).forEach(
		nameWithVersion => {
			const name = nameWithVersion.replace(/(.+)@.+/,'$1');
			packageVersionData[name] = lockfileJson.object[nameWithVersion].version;
			
			if (!packageTimeData[name]) {
				packageTimeData[name] = null;
			}
		}
	);
	return packageVersionData;
}

function loadCache () {
	try {
		const cacheFile = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
		const packageTimeData = JSON.parse(cacheFile);
		console.log('Cache loaded.');
		return packageTimeData;
	} catch {
		console.log('Error in cache file. Cache cleared.');
		return {};
	}
}

async function getPackagesData (packagesNames, packageTimeData) {
	for (let i = 0; i < packagesNames.length; i++) {
		const name = packagesNames[i];
		if (packageTimeData[name]) continue;
		const result = await axios.get("https://registry.npmjs.org/" + name);
		packageTimeData[name] = result.data.time;
		console.log(`Data recieved for: ${name} ${i+1}/${packagesNames.length}`);
		fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(packageTimeData))
	}
	console.log('');
}

function printFreshPackages(packageVersionData, packageTimeData) {
	const now = Date.now();
	Object.keys(packageVersionData).forEach(
		name => {
			const version = packageVersionData[name];
			const date = packageTimeData[name][version] || packageTimeData[name];
			
			const dateObj = new Date(date);
			const diffTime = Math.abs(now - dateObj);
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			
			if(diffDays < DAYS_DIFF_MIN) {
				console.log(`Package ${diffDays} days old: ${name}@${version} - ${dateObj.toLocaleDateString()}`);
			}
		}
	);
}