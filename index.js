const express = require('express')
const {google} = require('googleapis')
const _ = require('lodash');
// const json = require('express/lib/response')
const keys =  require('./keys.json')
const fs = require('fs');
const readline = require('readline');


const app = express()
app.use(express.json())

const port = 3000


const oauth2Client = new google.auth.OAuth2(
    keys.web.client_id,
    keys.web.client_secret,
    'http://localhost:3000'
  );
  
  
  const spreadsheetId =  '1bO53G4jJuw2_ILK-gnkaf5ek9S6JgZfQpkmHpeGql5U' ; 

  const scopes = [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/spreadsheets.readonly'
  ];
  
const getToken = async () => {
    const { tokens } = await oauth2Client.getToken(code);
    console.info(tokens);
    fs.writeFileSync('google-oauth-token.json', JSON.stringify(tokens));
};

//maintain the auth token for the user with help of refresh token

const token = fs.readFileSync('google-oauth-token.json', 'utf-8');
oauth2Client.setCredentials(JSON.parse(token));


  // Generate a url that asks permissions for the Drive activity scope
  const authorizationUrl = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',
    /** Pass in the scopes array defined above.
      * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
    scope: scopes,
    // Enable incremental authorization. Recommended as a best practice.
    include_granted_scopes: true
  });

app.get('/welcome',(req , res)=>{
    res.send('hey there you authorised now!') 
})
app.get('/login',(req , res)=>{
    res.send(`Enter this url in the browser : ${authorizationUrl}`)
    getToken();
})

app.get('/',(req , res)=>{


    let {code} = req.query ; 

    const err = code === undefined ; 

     if (err) {
        res.json({status: 402, error: `Please provide valid code`})
        return
      }

    oauth2Client.getToken(code, function (err, tokenInfo) {
        if (err) {
         res.json({error : err , status : 400});
         return;
        }
        fs.writeFileSync('google-oauth-token.json', JSON.stringify(tokenInfo));
        res.redirect('/welcome');
       });
})


//Read a Spreadsheet
const range="Sheet2!A1:A2";

app.get('/getdata', async(req , res)=>{

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    let {spreadsheetId,range} = req.query ; 

    const err = range === undefined || spreadsheetId === undefined; 

     if (err) {
        res.json({status: 402, error: `Please provide valid required parameters to get data from sheet`})
        return
      } 

    return sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })
      .then((data)=>{
        let rowsFromRes = [] ; 
        data.data.values.map((val , ind)=>{
            rowsFromRes.push({ rowNo:ind+1 , values: val})
        })  

        res.json({"status":"200" , "data":rowsFromRes , })
      }).catch((error)=>{
        // console.log('error' , error)
        res.json({"status":"400" , "error":error.response.data.error.message  })
      })
})


//updating the spreadsheet with help of range

app.post('/updatedata', async(req , res)=>{

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    //  console.log({requestBody: req.body})
     let {range , spreadsheetId , values} = req.body ; 

     const err = range === undefined || spreadsheetId === undefined || values === undefined ; 

     if (err) {
        res.json({status: 402, error: `Please provide valid required parameters to upadte sheet`})
        return
      } 

     return sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { range: range, majorDimension: "ROWS", values: values },
      })
      .then((data)=>{
        
        res.json({"status":200 , "data":"values updates ok" , })
      }).catch((error)=>{
        res.json({"status":400 , "error":error.response.data.error.message  })
      })
})


app.listen(port, ()=> console.log(`gsheet app listening on port ${port}!`))