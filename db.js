const mysql = require("mysql2");
const inquirer = require("inquirer");
require("dotenv").config();

let connection;

function connectDatabase(connect = true) {
  if (connect) {
    connection = mysql.createConnection({
      host: "localhost",
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });
  } else {
    connection.end();
  }
}
//Department functions
function viewAllDepartments(table) {
  connection.query(`SELECT * FROM ${table}`, function (err, results, fields) {
    if (err) {
      console.error("Error:", err.message);
      return;
    }

    console.log(`All ${table}:`);
    console.table(results);
  });
}

async function addDepartment() {
  try {
    const answers = await inquirer.prompt({
      type: "input",
      name: "name",
      message: "Enter department name:",
    });

    console.log(answers.name);

    await new Promise((resolve, reject) => {
      connection.query(
        "INSERT INTO `departments` SET ?",
        { name: answers.name },
        function (err, results, fields) {
          if (err) {
            console.error("Error:", err.message);
            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

// Role functions
async function createRole() {
  try {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "roleName",
        message: "Enter the name of the role:",
      },
      {
        type: "input",
        name: "salary",
        message: "Enter the salary for the role:",
      },
    ]);

    const departments = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT id, name FROM departments",
        (err, departments) => {
          if (err) {
            reject(err);
          } else {
            resolve(departments);
          }
        }
      );
    });

    // Prompt the user to select a department
    const departmentAnswer = await inquirer.prompt([
      {
        type: "list",
        name: "departmentId",
        message: "Select the department for the role:",
        choices: departments.map((department) => ({
          name: department.name,
          value: department.id,
        })),
      },
    ]);

    await new Promise((resolve, reject) => {
      connection.query(
        "INSERT INTO roles SET ?",
        {
          title: answers.roleName,
          salary: answers.salary,
          department_id: departmentAnswer.departmentId,
        },
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log(`Role "${answers.roleName}" added successfully.`);
            resolve(result);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

const getRoleChoices = () => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT id, title, department_id FROM roles",
      (err, roles) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            roles.map((role) => ({
              name: `${role.title} (Department: ${role.department_id})`,
              value: role.id,
              departmentId: role.department_id, // Include department_id in the returned object
            }))
          );
        }
      }
    );
  });
};

async function createEmployee() {
  try {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "first_name",
        message: "Enter the first name of the employee:",
      },
      {
        type: "input",
        name: "last_name",
        message: "Enter the last name of the employee:",
      },
      {
        type: "list",
        name: "role",
        message: "Select the role for the employee:",
        choices: await getRoleChoices(),
      },
      {
        type: "list",
        name: "manager",
        message: 'Select the manager for the employee (or choose "None"):',
        choices: await getManagerChoices(),
      },
    ]);

    // Fetch the selected role's information
    const selectedRole = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT title, salary, department_id FROM roles WHERE id = ?",
        [answers.role],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result[0]);
          }
        }
      );
    });

    await new Promise((resolve, reject) => {
      connection.query(
        "INSERT INTO employees (first_name, last_name, title, salary, role_id, department_id, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          answers.first_name,
          answers.last_name,
          selectedRole.title,
          selectedRole.salary,
          answers.role,
          selectedRole.department_id,
          answers.manager !== "None" ? answers.manager : null,
        ],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log(
              `Employee "${answers.first_name} ${answers.last_name}" added successfully.`
            );
            resolve(result);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

const updateEmployeeRole = async () => {
  try {
    // Fetch the list of employees
    const employeeChoices = await getEmployeeChoices();

    // Prompt the user to select an employee
    const employeeAnswer = await inquirer.prompt({
      type: "list",
      name: "employee",
      message: "Select the employee you want to update:",
      choices: employeeChoices,
    });

    console.log("Selected employee:", employeeAnswer.employee);

    // Fetch the list of roles
    const roleChoices = await getRoleChoices();

    // Prompt the user to select a new role
    const roleAnswer = await inquirer.prompt({
      type: "list",
      name: "role",
      message: "Select the new role for the employee:",
      choices: roleChoices,
    });

    console.log("Selected role:", roleAnswer.role);

    // Fetch the selected role's information
    const selectedRole = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT title, salary FROM roles WHERE id = ?",
        [roleAnswer.role],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result[0]);
          }
        }
      );
    });

    console.log("Selected role title:", selectedRole.title);
    console.log("Selected role salary:", selectedRole.salary);

    // Update the employee's role in the database
    await new Promise((resolve, reject) => {
      connection.query(
        "UPDATE employees SET role_id = ? WHERE id = ?",
        [roleAnswer.role, employeeAnswer.employee],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log("Employee role updated successfully.");
            resolve(result);
          }
        }
      );
    });

    // Update the employee's title in the database
    await new Promise((resolve, reject) => {
      connection.query(
        "UPDATE employees SET title = ? WHERE id = ?",
        [selectedRole.title, employeeAnswer.employee],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log("Employee title updated successfully.");
            resolve(result);
          }
        }
      );
    });

    // Update the employee's salary in the database
    await new Promise((resolve, reject) => {
      connection.query(
        "UPDATE employees SET salary = ? WHERE id = ?",
        [selectedRole.salary, employeeAnswer.employee],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log("Employee salary updated successfully.");
            resolve(result);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// Helper function to get employee choices
const getEmployeeChoices = () => {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT id, CONCAT(first_name, " ", last_name) AS employee_name FROM employees',
      (err, employees) => {
        if (err) {
          reject(err);
        } else {
          const employeeChoices = employees.map((employee) => ({
            name: employee.employee_name,
            value: employee.id,
          }));
          resolve(employeeChoices);
        }
      }
    );
  });
};

const getManagerChoices = () => {
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT id, CONCAT(first_name, " ", last_name) AS manager_name FROM employees',
      (err, managers) => {
        if (err) {
          reject(err);
        } else {
          const managerChoices = managers.map((manager) => ({
            name: manager.manager_name,
            value: manager.id,
          }));
          managerChoices.unshift({ name: "None", value: "None" }); // Add "None" option
          resolve(managerChoices);
        }
      }
    );
  });
};

const updateManager = async () => {
  try {
    // Fetch the list of employees
    const employeeChoices = await getEmployeeChoices();

    // Prompt the user to select an employee
    const employeeAnswer = await inquirer.prompt({
      type: "list",
      name: "employee",
      message: "Choose the employee whose manager you want to update:",
      choices: employeeChoices,
    });

    console.log("Selected employee:", employeeAnswer.employee);

    // Fetch the list of managers (including "None" option)
    const managerChoices = await getManagerChoices();

    // Prompt the user to select a new manager
    const managerAnswer = await inquirer.prompt({
      type: "list",
      name: "manager",
      message: "Choose the new manager for the employee (or choose 'None'):",
      choices: managerChoices,
    });

    console.log("Selected manager:", managerAnswer.manager);

    // Update the employee's manager in the database
    await new Promise((resolve, reject) => {
      connection.query(
        "UPDATE employees SET manager_id = ? WHERE id = ?",
        [
          managerAnswer.manager !== "None" ? managerAnswer.manager : null,
          employeeAnswer.employee,
        ],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log("Employee manager updated successfully.");
            resolve(result);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const viewEmployeesByManager = async () => {
  try {
    // Fetch the list of managers
    const managerChoices = await getManagerChoices();

    // Prompt the user to select a manager
    const managerAnswer = await inquirer.prompt({
      type: "list",
      name: "manager",
      message: "Select the manager to view their employees:",
      choices: managerChoices,
    });

    console.log("Selected manager:", managerAnswer.manager);

    // Fetch and display all employees with the selected manager
    const employeesByManager = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT * FROM employees WHERE manager_id = ?",
        [managerAnswer.manager !== "None" ? managerAnswer.manager : null],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    // Display the list of employees
    console.log("Employees with the selected manager:");
    employeesByManager.forEach((employee) => {
      console.log(`${employee.first_name} ${employee.last_name}`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

// Assuming you have a function to fetch department choices
const getDepartmentChoices = async () => {
  return new Promise((resolve, reject) => {
    connection.query("SELECT id, name FROM departments", (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          result.map((department) => ({
            name: department.name,
            value: department.id,
          }))
        );
      }
    });
  });
};

const viewEmployeesByDepartment = async () => {
  try {
    // Fetch the list of departments
    const departmentChoices = await getDepartmentChoices();

    // Prompt the user to select a department
    const departmentAnswer = await inquirer.prompt({
      type: "list",
      name: "department",
      message: "Select the department to view its employees:",
      choices: departmentChoices,
    });

    console.log("Selected department:", departmentAnswer.department);

    // Fetch and display all employees in the selected department
    const employeesByDepartment = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT * FROM employees WHERE department_id = ?",
        [departmentAnswer.department],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    // Display the list of employees
    console.log(`Employees in the ${departmentAnswer.department} department:`);
    employeesByDepartment.forEach((employee) => {
      console.log(`${employee.first_name} ${employee.last_name}`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

const deleteEntry = async () => {
  try {
    // Prompt the user to select the type of record to delete
    const recordTypeAnswer = await inquirer.prompt({
      type: "list",
      name: "recordType",
      message: "Select the type of record to delete:",
      choices: ["Department", "Role", "Employee"],
    });

    console.log(`Selected record type: ${recordTypeAnswer.recordType}`);

    // Fetch and display all records of the selected type
    const records = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT * FROM ${recordTypeAnswer.recordType.toLowerCase()}s`,
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    // Display the list of records
    console.log(`All ${recordTypeAnswer.recordType.toLowerCase()}s:`);
    records.forEach((record) => {
      console.log(JSON.stringify(record, null, 2));
    });

    const recordToDeleteAnswer = await inquirer.prompt({
      type: "list",
      name: "recordToDelete",
      message: `Select the ${recordTypeAnswer.recordType.toLowerCase()} to delete:`,
      choices: records.map((record) => ({
        name: `${
          recordTypeAnswer.recordType === "Employee"
            ? `${record.first_name} ${record.last_name}`
            : recordTypeAnswer.recordType === "Role"
            ? record.title
            : record.name || "Unknown"
        }`,
        value: record.id,
      })),
    });

    console.log(
      `Selected ${recordTypeAnswer.recordType.toLowerCase()} to delete: ${
        recordToDeleteAnswer.recordToDelete
      }`
    );

    // Delete the selected record
    await new Promise((resolve, reject) => {
      const sql = `DELETE FROM ${recordTypeAnswer.recordType.toLowerCase()}s WHERE id = ?`;
      console.log("Executing SQL query:", sql);

      connection.query(
        sql,
        [recordToDeleteAnswer.recordToDelete],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log(`${recordTypeAnswer.recordType} deleted successfully.`);
            resolve(result);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
};

module.exports = {
  viewAllDepartments,
  addDepartment,
  createRole,
  createEmployee,
  updateEmployeeRole,
  updateManager,
  viewEmployeesByManager,
  viewEmployeesByDepartment,
  deleteEntry,
  connectDatabase,
};
