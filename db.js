const mysql = require("mysql2");
const inquirer = require("inquirer");

const connection = mysql.createConnection({
  host: "localhost",
  user: "Mohamed Khalil",
  password: "1234",
  database: "employee_manager",
});

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
        "INSERT INTO employees SET ?",
        {
          first_name: answers.first_name,
          last_name: answers.last_name,
          title: selectedRole.title,
          salary: selectedRole.salary,
          role_id: answers.role,
          department_id: selectedRole.department_id,
          manager_id: answers.manager !== "None" ? answers.manager : null,
        },
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

    // Update the employee's role, title, and salary in the database
    await new Promise((resolve, reject) => {
      connection.query(
        "UPDATE employees SET role_id = ?, title = ?, salary = ? WHERE id = ?",
        [
          roleAnswer.role,
          selectedRole.title,
          selectedRole.salary,
          employeeAnswer.employee,
        ],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log(
              "Employee role, title, and salary updated successfully."
            );
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

module.exports = {
  viewAllDepartments,
  addDepartment,
  createRole,
  createEmployee,
  updateEmployeeRole,
  connection,
};
