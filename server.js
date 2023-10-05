const express = require('express');
const app = express.express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const moment = require('moment');
const fs   = require('fs');

const port = 3000; //porta padrão
const db ={
  host     : process.env.HOST,
  port     : process.env.DB_PORT,
  user     : process.env.USER,
  password : process.env.PASSWORD,
  database : process.env.DATABASE
}

app.use(bodyParser.urlencoded({extended: 'false'}));
app.use(bodyParser.json());
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

var cors = require('cors');
app.use(express.static("public"));
app.use(cors());

app.use(express.json());	
app.get('/', (req, res) => res.json({ message: 'Funcionando!' }));

const privateKey = process.env.PRIVATE_KEY;
const publicKey = process.env.PUBLIC_KEY;

const middlewareValidarJWT = (req, res, next) => {
    const jwtToken = req.headers["authorization"];
  
    jwt.verify(jwtToken, privateKey, (err, userInfo) => {
        if (err) {
            res.status(403).end();
            return;
        }

        req.userInfo = userInfo;
        next();
    });
};

function execSQLQuery(sqlQry, id, res){
  const connection = mysql.createConnection(db);
  
  connection.query(sqlQry, id, (error, results, fields) => {
    
      if(error) 
        res.json(error);
      else
        res.json(results);
    
      connection.end();
      console.log('executou!');
  });
}

async function resultSQLQuery(sqlQry, id) {
  const connection = await mysql.createConnection(db);
  
  var [result] = await connection.promise().query(sqlQry, id);
  try {
    return result;
  } catch (err) {
    console.log("error");
    throw err;
  }  
}

function resultSQLQuery2(sqlQry, id) {
  const connection =  mysql.createConnection(db);
  try {
    return connection.promise().query(sqlQry, id).then().then();
  }catch (err) {
    console.log("error");
    throw err;
  }
}  

app.get('/user/:id?', (req, res) => {
  middlewareValidarJWT(req, res)  
  const id = [req.params.id];
  execSQLQuery('SELECT * FROM user WHERE guid=?',id, res);
})

app.delete('/user/:id', (req, res) =>{
    const id = [req.params.id];
    execSQLQuery('DELETE FROM user WHERE guid=?',id, res);
})

app.post('/user/create', (req, res) => {
  const date = moment().format('yyyy-mm-dd:hh:mm:ss');
  
  bcrypt.hash(req.body.password, 10, function(err, hash) {
    execSQLQuery( 'INSERT INTO user(name, email, birthdate, password, created_at) VALUES(?,?,?,?,?)', 
      req.body.nome, req.body.email, req.body.birthdate, hash, date);
  });
  
});

app.put('/usuarios/:id', (req, res) => {
  const data = req.body; 
  const id = [data.nome,req.params.id];
  execSQLQuery('UPDATE usuario SET usu_nome=? WHERE idusuario=?',id, res);
});

app.get('/external', (req, res) => {
  
  const response = fetch('https://dog.ceo/api/breeds/list/all',{
    method: 'get',
    //body: JSON.stringify(req.body),
    headers: {'Content-Type': 'application/json'}
  }).then(response => response.json()) 
  .then(json => res.json(json))   
  .catch(err => console.log('Erro de solicitação', err)); 
});

app.post('/login', async (req, res) => {
  const data = req.body;
  const id = [data.email, data.senha];
  
  var [result] = await resultSQLQuery('SELECT * FROM usuario WHERE usu_email=? and usu_senha=?',id);
  
  if(result){
    res.json({"menssagem": "sucesso!"})
    jwt.sign(req.body, privateKey, (err, token) => {
              if (err) {
                  res
                      .status(500)
                      .json({ mensagem: "Erro ao gerar o JWT" });

                  return;
              }
              res.set("x-access-token", token);
              res.json(result);
              res.end();
          });
  }
  else
    res.send({"menssagem": false})
});

//inicia o servidor
app.listen(port);
console.log('API funcionando!');