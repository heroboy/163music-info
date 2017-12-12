const request = require('request');
const ID3Writer = require('browser-id3-writer');
const fs = require('fs');
const { createWebAPIRequest } = require('./NeteaseCloudMusicApi/util/util');
function requestJson(url)
{
	return new Promise((resolve, reject) =>
	{
		request.get(url, (err, resp, body) =>
		{
			if (err)
			{
				reject(err);
				return;
			}

			if (resp.statusCode !== 200)
			{
				reject(new Error('status != 200'));
				return;
			}

			if (typeof body !== 'string')
			{
				reject(new Error('body not text'));
				return;
			}
			resolve(JSON.parse(body));
		});
	});
}

function requestBuffer(url)
{
	return new Promise((resolve, reject) =>
	{
		request.get({ url: url, encoding: null }, (err, resp, body) =>
		{
			if (err)
			{
				reject(err);
				return;
			}

			if (resp.statusCode !== 200)
			{
				reject(new Error('status != 200'));
				return;
			}

			if (!Buffer.isBuffer(body))
			{
				console.log(body)
				reject(new Error('body not Buffer'));
				return;
			}
			resolve(body);
		});
	});
}

async function getSongDetail(id)
{
	//const id = parseInt(req.query.ids)
	const data = {
		c: JSON.stringify([{ id: id }]),
		ids: '[' + id + ']',
		csrf_token: ''
	}
	const cookie = '';
	return new Promise((resolve, reject) =>
	{
		createWebAPIRequest(
			'music.163.com',
			'/weapi/v3/song/detail',
			'POST',
			data,
			cookie,
			music_req =>
			{
				let obj = JSON.parse(music_req);
				resolve(obj);
			},
			reject
		)

	});
}


async function process(id)
{
	const songBuffer = fs.readFileSync(`in/${id}.mp3`);
	const songInfo = (await getSongDetail(id)).songs[0];
	const writer = new ID3Writer(songBuffer);
	writer.setFrame('TIT2', songInfo.name); //song title
	writer.setFrame('TALB', songInfo.al.name); //album title
	writer.setFrame('TPE1', songInfo.ar.map(x => x.name)); //song artists
	writer.setFrame('TRCK', songInfo.no.toString());//song number in album
	//cover
	//writer.setFrame('APIC', {
	//	type: 3, //cover
	//	data: await requestBuffer(songInfo.al.picUrl),
	//	description: '',
	//	useUnicodeEncoding: false
	//});
	writer.addTag();

	const taggedSongBuffer = Buffer.from(writer.arrayBuffer);
	fs.writeFileSync(`out/${id}.mp3`, taggedSongBuffer);
}

async function main()
{
	function exists(path)
	{
		try
		{
			return fs.statSync(path) != null;
		}
		catch(e)
		{
			return false;
		}
	}
	for (f of fs.readdirSync('in/'))
	{
		let m = /([0-9]+)\.mp3/i.exec(f);

		if (m && !exists(`out/${m[1]}.mp3`))
		{
			console.log('start process:', f)
			await process(m[1]);
		}
	}
}
main();
//getSongDetail(792383).then(console.log);
