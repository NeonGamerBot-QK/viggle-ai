const express = require('express')
const { existsSync, writeFileSync, rmSync } = require('fs')
const app = express()
const path = require('path')
const fetch = require('node-fetch')
const puppeteer = require('puppeteer-extra')
const wait = require('util').promisify(setTimeout)
// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
function awaitInput () {
  return new Promise((res) => {
    process.stdin.on('data', res)
  })
}
app.use(require('express-fileupload')({
  limits: { fileSize: 50 * 1024 * 1024 }
    // useTempFiles : true,
    // tempFileDir : __dirname+'/tmp/'
}))
let inProg = false
puppeteer.launch({ headless: false, args: ['--no-sandbox'] }).then(async browser => {
  const page = await browser.newPage()
    // await page.setViewport({ width: 800, height: 600 })

  await page.goto(`https://viggle.ai/`)
// await page.waitForSelector(`.ant-btn`)
// await page.waitForNavigation(0)

  await page.click('.ant-btn-lg')
// await page.evalulate(()=>document.querySelector('.ant-btn').click())
  await page.waitForNavigation(0)
// login
  console.log('e')
  await wait(550)
  await page.click('.ant-btn')
// await page.evalulate(() => {
//     document.querySelectorAll('.ant-btn-lg')[0].click()
// })
  await page.waitForSelector('#account')
  await page.type('#account', process.env.USERNAME)
  await page.waitForSelector('#passwd')
  await page.type('#passwd', process.env.PASSWORD)
  await page.click('.ant-btn')
// dump cookies
// then i do captch
  console.log('Please solve the captcha and press enter')
  await awaitInput()

  if (!existsSync('cookies.json')) {
    writeFileSync('cookies.json',
JSON.stringify(await page.cookies()))
  }
// wowie zowie im at the main page what should i do
  app.post('/test-files', (req, res) => {
    res.json(req.files)
  })
  app.use('/downloads', express.static(__dirname + '/downloads'))
  app.post('/upload', async (req, res) => {
    const id = Math.random().toString().split('.')[1]
    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).send('No files were uploaded.')
      return
    }
      console.log('req.files >>>', req.files); // eslint-disable-line
      // first before we upload tag all other video els with something that says that they are not the one we want
    await wait(1000)
    inProg = true
    //   await wait(250)
      // tag of them all first then ill let u fucking run
    //   return;
    const tempFile = (file, uploadPath) => {
      return new Promise((res, rej) => {
        file.mv(uploadPath, function (err) {
          if (err) rej(err)
            //   return res.status(500).send(err);
          res(uploadPath)
            // res.send('File uploaded!');
        })
      })
    }
    const person = await tempFile(req.files.person, `./downloads/_${id}.png`) || path.relative(process.cwd(), __dirname + `/downloads/example.png`)
    const videoF = await tempFile(req.files.video, `./downloads/_${id}.mp4`) || path.relative(process.cwd(), __dirname + `/downloads/example.mp4`)
    const character = await page.$(`input[accept="image/jpeg,image/png"]`)
    await character.uploadFile(person)
    await character.evaluate(upload => upload.dispatchEvent(new Event('change', { bubbles: true })))
    await wait(500)
    const video = await page.$(`input[accept="video/*"]`)
    await video.uploadFile(videoF)
    await video.evaluate(upload => upload.dispatchEvent(new Event('change', { bubbles: true })))
    await page.evaluate(() => {
      Array.from(document.getElementsByTagName('video')).forEach(e => e.setAttribute('data-tagged', '1'))
    })
    await wait(4750)
    await page.click('.ant-btn-primary-green')
    const waitForVid = async (page) => {
      const result = await page.evaluate(() => {
        return Boolean(Array.from(document.getElementsByTagName('video')).find(e => !e.getAttribute('data-tagged', '1'))) && Array.from(document.getElementsByTagName('video')).find(e => !e.getAttribute('data-tagged', '1')).poster
      })
      await wait(250)
      if (!result) return await waitForVid(page)
      else return true
    }
    await wait(500)
    const stamp = Date.now()
    const caniContinueOrWillThisLineBreakTheCode = await waitForVid(page)
    console.log(`Took ${Date.now() - stamp}ms`)
    if (caniContinueOrWillThisLineBreakTheCode) {
      await page.evaluate(() => {
        return Array.from(document.getElementsByTagName('video')).find(e => !e.getAttribute('data-tagged', '1')).click()
      })
      await wait(700)
      const src_url = await page.evaluate(() => {
        return document.getElementsByTagName('video')[0].src
      })
      fetch(src_url).then(r => {
                        // res.set({ 'Content-Type': 'video/mp4' })
        rmSync(`./downloads/_${id}.png`)
        rmSync(`./downloads/_${id}.mp4`)
                        // r.body.pipe(res)
        return r.buffer()
      }).then(async buff => {
        writeFileSync('./downloads/' + id + '.mp4', buff)
        inProg = false
                        // res.end(buff)
                        // res.send(buff)
        await page.evaluate(() => {
          document.getElementsByClassName('icon-delete')[0].click()
          setTimeout(() => document.getElementsByClassName('ant-btn-primary')[0].click(), 5000)
        })
                        // work whore as in redirect cuz u cannot serve
        res.redirect('/downloads/' + id + '.mp4')
      })
    }
  })
  app.get('/form', (req, res) => {
    res.send(`<html>
	<body>
		<form ref='uploadForm' 
			id='uploadForm' 
			action='/upload' 
			method='post' 
			encType="multipart/form-data">
            person:
				<input type="file" name="person" />
                video:
				<input type="file" name="video" />
				<input type='submit' value='Upload!' />
		</form>		
	</body>
</html>`)
  })
  app.listen(3000, () => {
    console.log('::3000')
  })
})
process.on('uncaughtException', console.error)
