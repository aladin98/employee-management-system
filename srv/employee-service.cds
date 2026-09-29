using { my.company.hr as hr } from '../db/schema';

service EmployeeService {
    entity Departments as projection on hr.Departments;
    entity Roles       as projection on hr.Roles;
    entity JobTitles   as projection on hr.JobTitles;
    entity Employees   as projection on hr.Employees;
}