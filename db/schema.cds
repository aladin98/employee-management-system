namespace my.company.hr;

using { managed } from '@sap/cds/common';

entity Departments : managed {
    key ID          : String(10);
        name        : String(100);
        location    : String(100);

        employees   : Association to many Employees
                        on employees.department = $self;
}

entity Roles : managed {
    key ID          : String(10);
        name        : String(50);
        description : String(255);
}

entity JobTitles : managed {
    key ID          : String(10);
        title       : String(100);
        description : String(255);
}

entity Employees : managed {
    key ID          : String(10);
        firstName   : String(50);
        lastName    : String(50);
        fullName    : String(100);
        email       : String(100);
        phone       : String(16);
        hireDate    : Date;
        salary      : Decimal(15,2);
        isActive    : Boolean default true;
        country     : String(30);

        department  : Association to Departments;
        role        : Association to Roles;
        jobTitle    : Association to JobTitles;
        manager     : Association to Employees;
}