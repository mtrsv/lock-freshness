const fs = require('fs');
const lockfile = require('@yarnpkg/lockfile');
const axios = require('axios');

const LOCK_FILE_PATH = './lock/yarn.lock';
const CACHE_FILE_PATH = 'cache.txt';
const DAYS_DIFF_MIN = 30;
const REGISTRY_URL = 'https://registry.npmjs.org/';

main();

async function main() {
	const file = fs.readFileSync(LOCK_FILE_PATH, 'utf8');
	const lockfileJson = lockfile.parse(file);
	
	const packageTimeData = loadCache();

	const packageVersionData = getVerisons(lockfileJson, packageTimeData);
	
	await getPackagesData(packageTimeData);
	
	printFreshPackages(packageVersionData, packageTimeData);
}

function getVerisons (lockfileJson, packageTimeData) {
	console.log('Different dependencies versions found in lockfile:', Object.keys(lockfileJson.object).length);
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
		console.log('Cache loaded. Packages in cache:', Object.keys(packageTimeData).length);
		return packageTimeData;
	} catch {
		console.log('Error in cache file. Cache cleared.');
		return {};
	}
}

async function getPackagesData (packageTimeData) {
	const packagesNames = Object.keys(packageTimeData); 

	for (let i = 0; i < packagesNames.length; i++) {
		const name = packagesNames[i];
		if (packageTimeData[name]) continue;
		const result = await axios.get(REGISTRY_URL + name);
		packageTimeData[name] = result.data.time;
		console.log(`Data recieved for: ${name} ${i+1}/${packagesNames.length}`);
		fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(packageTimeData))
	}
	console.log('');
}

function printFreshPackages(packageVersionData, packageTimeData) {
	const now = Date.now();
	const result = [];
	Object.keys(packageVersionData).forEach(
		name => {
			const version = packageVersionData[name];
			const date = packageTimeData[name][version] || packageTimeData[name];
			
			const dateObj = new Date(date);
			const diffTime = Math.abs(now - dateObj);
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			
			if (diffDays < DAYS_DIFF_MIN) {
				result.push(`Package ${diffDays} days old: ${name}@${version} - ${dateObj.toLocaleDateString()}`);
			}
		}
	);
	if (result.length > 0) {
		result.forEach(row => console.log(row));
	} else {
		console.log('No fresh packages found.');
	}
}