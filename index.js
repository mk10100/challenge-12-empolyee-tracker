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
  connection,
} = require("./db");

// TODO: Create an array of questions for user input
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
      console.log("Enters" );
      await viewEmployeesByDepartment();
    } else if (action === "Delete entry") {
      await deleteEntry();
    }
  } finally {
    if (action !== "Quit") {
      init();
    } else {
      connection.end();
    }
  }
}

function init() {
  inquirer.prompt(mainQuestion).then((answers) => {
    handleAction(answers.title);
  });
}

init();
