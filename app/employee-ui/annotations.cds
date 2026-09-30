using EmployeeService as service from '../../srv/employee-service';

annotate service.Departments with {
    ID @Common.Text : name
       @Common.TextArrangement : #TextOnly;
};

annotate service.Roles with {
    ID @Common.Text : name
       @Common.TextArrangement : #TextOnly;
};

annotate service.JobTitles with {
    ID @Common.Text : title
       @Common.TextArrangement : #TextOnly;
};

annotate service.Employees with {
    department @Common.Text : department.name
               @Common.TextArrangement : #TextOnly;

    role       @Common.Text : role.name
               @Common.TextArrangement : #TextOnly;

    jobTitle   @Common.Text : jobTitle.title
               @Common.TextArrangement : #TextOnly;

    manager    @Common.Text : manager.fullName
               @Common.TextArrangement : #TextOnly;
};

annotate service.Employees with @(
    UI.SelectionFields : [
        ID,
        firstName
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'First Name',
            Value : firstName,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Last Name',
            Value : lastName,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Department',
            Value : department_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Role',
            Value : role_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Job Title',
            Value : jobTitle_ID,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Manager',
            Value : manager_ID,
        }
    ],
    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Employee ID',
                Value : ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'First Name',
                Value : firstName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Last Name',
                Value : lastName,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Email',
                Value : email,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Phone',
                Value : phone,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Hire Date',
                Value : hireDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Salary',
                Value : salary,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Active',
                Value : isActive,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Country',
                Value : country,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Department',
                Value : department_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Role',
                Value : role_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Job Title',
                Value : jobTitle_ID,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Manager',
                Value : manager_ID,
            }
        ]
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneralInformationFacet',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneralInformation',
        }
    ]
);

annotate service.Employees with {
    department @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Departments',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : department_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'location',
            },
        ],
    };

    role @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Roles',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : role_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'description',
            },
        ],
    };

    jobTitle @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'JobTitles',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : jobTitle_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'title',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'description',
            },
        ],
    };

    manager @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Employees',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : manager_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'fullName',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'email',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'phone',
            },
        ],
    }
};