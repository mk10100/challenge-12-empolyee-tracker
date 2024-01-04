const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const {
  addDepartment,
  viewAllDepartments,
  createRole,
  createEmployee,
  updateEmployeeRole,
  updateManager,
  viewEmployeesByManager,
  viewEmployeesByDepartment,
  deleteEntry,
  connectDatabase,
} = require("./db");
require("dotenv").config();

async function createDatabase() {
  try {
    const newConnection = await mysql.createConnection({
      host: "localhost",
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
    });
    await newConnection.query("CREATE DATABASE IF NOT EXISTS employee_db");
    console.log("Database created successfully");
    newConnection.end();
  } catch (error) {
    console.error("Error creating database:", error);
  }
}

async function executeSchemaQuery() {
  try {
    const schemaConnection = await mysql.createConnection({
      host: "localhost",
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: 3306,
    });

    const schemaFilePath = path.join(__dirname, "db", "schema.sql");
    const schemaQuery = fs.readFileSync(schemaFilePath, "utf8");

    const schemaQueries = schemaQuery.split(";");
    for (let query of schemaQueries) {
      if (query.trim() !== "") {
        await schemaConnection.query(query);
      }
    }
    console.log("Schema query executed successfully");
    schemaConnection.end();
  } catch (error) {
    console.error("Error executing schema query:", error);
  }
}

const mainQuestion = [
  {
    type: "list",
    name: "title",
    message: "What would you like to do?",
    choices: [
      "View all departments",
      "View all roles",
      "View all employees",
      "Add a department",
      "Add a role",
      "Add an employee",
      "Update an employee",
      "Update manager",
      "View employees by manager",
      "View employees by department",
      "Delete entry",
      "Quit",
    ],
  },
];

async function handleAction(action) {
  try {
    if (action === "View all departments") {
      viewAllDepartments("departments");
    }
    if (action === "View all roles") {
      viewAllDepartments("roles");
    }
    if (action === "View all employees") {
      viewAllDepartments("employees");
    } else if (action === "Add a department") {
      await addDepartment();
    } else if (action === "Add a role") {
      await createRole();
    } else if (action === "Add an employee") {
      await createEmployee();
    } else if (action === "Update an employee") {
      await updateEmployeeRole();
    } else if (action === "Update manager") {
      await updateManager();
    } else if (action === "View employees by manager") {
      await viewEmployeesByManager();
    } else if (action === "View employees by department") {
      await viewEmployeesByDepartment();
    } else if (action === "Delete entry") {
      await deleteEntry();
    }
  } finally {
    if (action !== "Quit") {
      promptLoop();
    } else {
      connectDatabase(false);
    }
  }
}

async function promptLoop() {
  inquirer.prompt(mainQuestion).then((answers) => {
    handleAction(answers.title);
  });
}

async function init() {
  await createDatabase();
  await executeSchemaQuery();
  connectDatabase();
  promptLoop();
}

init();
