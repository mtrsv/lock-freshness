const fs = require('fs');
const lockfile = require('@yarnpkg/lockfile');
const axios = require('axios');

const LOCK_FILE_PATH = './lockfile/yarn.lock';
const LOCK_FILE_PATH_JSON = './lockfile/package-lock.json';
const CACHE_FILE_PATH = 'cache.txt';

const DAYS_DIFF_MIN = 30;
const REGISTRY_URL = 'https://registry.npmjs.org/';

main();

async function main() {
	const lockfileJson = getLockfileJson();
	if(!lockfileJson) return;

	const packagesReleaseData = loadCache();
	const lockfilePackageData = getVersions(lockfileJson, packagesReleaseData);
	await fetchPackagesData(lockfilePackageData, packagesReleaseData);
	
	printFreshPackages(lockfilePackageData, packagesReleaseData);
}

function getLockfileJson() {
	try {
		const file = fs.readFileSync(LOCK_FILE_PATH, 'utf8');
		return lockfile.parse(file).object;
	} catch  {
		try {
			const file = fs.readFileSync(LOCK_FILE_PATH_JSON, 'utf8');
			return JSON.parse(file).dependencies;
		} catch {
			console.log('No correct lockfile found in ./lockfile/ folder.');
			return null;
		}
	}
}

function getVersions (lockfileJson, packagesReleaseData) {
	console.log('Different dependencies versions found in lockfile:', Object.keys(lockfileJson).length);
	const lockfilePackageData = {};
	Object.keys(lockfileJson).forEach(
		nameWithVersion => {
			const name = nameWithVersion.replace(/(.+)@.+/,'$1');
			lockfilePackageData[name] = lockfileJson[nameWithVersion].version;
		}
	);
	return lockfilePackageData;
}

function loadCache () {
	try {
		const cacheFile = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
		const packagesReleaseData = JSON.parse(cacheFile);
		console.log('Cache loaded. Packages in cache:', Object.keys(packagesReleaseData).length);
		return packagesReleaseData;
	} catch {
		console.log('Error in cache file. Cache cleared.');
		return {};
	}
}

async function fetchPackagesData (lockfilePackageData, packagesReleaseData) {
	const packagesNames = Object.keys(lockfilePackageData); 

	for (let i = 0; i < packagesNames.length; i++) {
		const name = packagesNames[i];
		if (packagesReleaseData[name]) continue;
		let result = null;
		try {
			result = await axios.get(REGISTRY_URL + name);
		} catch (e) {
			console.log('Problems with getting package:', name);
			console.log('  ', e.message);
			console.log('Package skipped. You can try again.')
			continue;
		}
		
		packagesReleaseData[name] = result.data.time;
		console.log(`Data recieved for: ${name} ${i+1}/${packagesNames.length}`);
		fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(packagesReleaseData))
	}
	console.log('');
}

function printFreshPackages(lockfilePackageData, packagesReleaseData) {
	const now = Date.now();
	const result = [];
	Object.keys(lockfilePackageData).forEach(
		name => {
			const version = lockfilePackageData[name];
			const packageData = packagesReleaseData[name];
			if (!packageData) {
				console.log('No info about package:', name);
				return;
			}
			
			const dateString = packageData[version];
			if (!dateString) {
				console.log('No info about version:', `${name}@${version}`);
				return;
			}

			const dateObj = new Date(dateString);
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