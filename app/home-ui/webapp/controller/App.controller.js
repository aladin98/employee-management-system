sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Configuration"
], function (Controller, MessageToast, JSONModel, Configuration) {
  "use strict";

  return Controller.extend("homeui.controller.App", {
    onInit: function () {
      var sLanguage = Configuration.getLanguage();
      var bFrench = sLanguage && sLanguage.toLowerCase().startsWith("fr");
      var sSelectedLanguage = bFrench ? "fr" : "en";

      var oTexts = bFrench ? {
        appTitle: "Système de Gestion des Employés",
        home: "Accueil",
        myProfile: "Mon Profil",
        settings: "Paramètres",
        logout: "Déconnexion",
        welcomeTitle: "Bon retour",
        welcomeText: "Accédez à l’administration des employés, aux validations des congés, aux workflows de promotion et aux notifications depuis un espace central.",
        role: "Rôle",
        jobTitle: "Poste",
        department: "Département",
        manager: "Manager",
        email: "E-mail",
        phone: "Téléphone",
        hireDate: "Date d'embauche",
        yearsHere: "Ancienneté",
        language: "Langue",
        close: "Fermer",
        save: "Enregistrer",
        employees: "Employés",
        pendingLeaveRequests: "Demandes de congé en attente",
        promotionRequests: "Demandes de promotion",
        unreadNotifications: "Notifications non lues",
        applications: "Applications",
        quickActions: "Actions rapides",
        employeesSub: "Gérer les données des employés",
        leaveSub: "Consulter et approuver les demandes de congé",
        promotionSub: "Gérer le workflow hiérarchique des promotions",
        feedbacks: "Retours",
        feedbackSub: "Suivre l’historique des validations et commentaires",
        notifications: "Notifications",
        notificationsSub: "Consulter les alertes et mises à jour",
        masterData: "Données de base",
        workflow: "Workflow",
        history: "Historique",
        communication: "Communication",
        openLeaveRequests: "Ouvrir les demandes de congé",
        openPromotionRequests: "Ouvrir les demandes de promotion",
        openNotifications: "Ouvrir les notifications",
        statsLoadError: "Impossible de charger les statistiques du tableau de bord",
        profileLoadError: "Impossible de charger le profil utilisateur",
        logoutMessage: "La déconnexion sera gérée plus tard via SAP Launchpad / Identity."
      } : {
        appTitle: "Employee Management System",
        home: "Home",
        myProfile: "My Profile",
        settings: "Settings",
        logout: "Logout",
        welcomeTitle: "Welcome back",
        welcomeText: "Access employee administration, leave approvals, promotion workflows and notifications from one central space.",
        role: "Role",
        jobTitle: "Job Title",
        department: "Department",
        manager: "Manager",
        email: "Email",
        phone: "Phone",
        hireDate: "Hiring Date",
        yearsHere: "Years Here",
        language: "Language",
        close: "Close",
        save: "Save",
        employees: "Employees",
        pendingLeaveRequests: "Pending Leave Requests",
        promotionRequests: "Promotion Requests",
        unreadNotifications: "Unread Notifications",
        applications: "Applications",
        quickActions: "Quick Actions",
        employeesSub: "Manage employee master data",
        leaveSub: "Review and approve leave requests",
        promotionSub: "Manage hierarchical promotion workflow",
        feedbacks: "Feedbacks",
        feedbackSub: "Track validation history and comments",
        notifications: "Notifications",
        notificationsSub: "Check updates and workflow alerts",
        masterData: "Master Data",
        workflow: "Workflow",
        history: "History",
        communication: "Communication",
        openLeaveRequests: "Open Leave Requests",
        openPromotionRequests: "Open Promotion Requests",
        openNotifications: "Open Notifications",
        statsLoadError: "Unable to load dashboard statistics",
        profileLoadError: "Unable to load user profile",
        logoutMessage: "Logout will be handled later via SAP Launchpad / Identity."
      };

      var oHomeModel = new JSONModel({
        texts: oTexts,
        userName: "Demo User",
        role: "",
        department: "",
        selectedLanguage: sSelectedLanguage,
        profile: {
          fullName: "",
          role: "",
          jobTitle: "",
          department: "",
          manager: "",
          email: "",
          phone: "",
          hireDate: "",
          yearsHere: ""
        },
        stats: {
          employees: "0",
          leave: "0",
          promotions: "0",
          notifications: "0"
        }
      });

      this.getView().setModel(oHomeModel, "home");
      this._loadDashboardStats();
      this._loadCurrentProfile();
    },

    _calculateYearsHere: function (sHireDate) {
      if (!sHireDate) return "";

      var oHireDate = new Date(sHireDate);
      var oToday = new Date();
      var iYears = oToday.getFullYear() - oHireDate.getFullYear();
      var iMonths = oToday.getMonth() - oHireDate.getMonth();

      if (iMonths < 0 || (iMonths === 0 && oToday.getDate() < oHireDate.getDate())) {
        iYears--;
      }

      var sLanguage = Configuration.getLanguage();
      var bFrench = sLanguage && sLanguage.toLowerCase().startsWith("fr");

      if (bFrench) {
        return iYears <= 1 ? iYears + " an" : iYears + " ans";
      }

      return iYears <= 1 ? iYears + " year" : iYears + " years";
    },

    _loadDashboardStats: function () {
      var oModel = this.getView().getModel("home");
      var sUrl = window.location.origin + "/odata/v4/employee/getDashboardStats()";

      fetch(sUrl)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Failed to load dashboard statistics");
          }
          return response.json();
        })
        .then(function (data) {
          oModel.setProperty("/stats/employees", String(data.employees || 0));
          oModel.setProperty("/stats/leave", String(data.leaveRequests || 0));
          oModel.setProperty("/stats/promotions", String(data.promotions || 0));
          oModel.setProperty("/stats/notifications", String(data.notifications || 0));
        })
        .catch(function () {
          MessageToast.show(oModel.getProperty("/texts/statsLoadError"));
        });
    },

    _loadCurrentProfile: function () {
      var oModel = this.getView().getModel("home");
      var sUrl = window.location.origin + "/odata/v4/employee/getCurrentProfile()";
      var that = this;

      fetch(sUrl)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Failed to load user profile");
          }
          return response.json();
        })
        .then(function (data) {
          oModel.setProperty("/userName", data.fullName || "");
          oModel.setProperty("/role", data.role || "");
          oModel.setProperty("/department", data.department || "");

          oModel.setProperty("/profile/fullName", data.fullName || "");
          oModel.setProperty("/profile/role", data.role || "");
          oModel.setProperty("/profile/jobTitle", data.jobTitle || "");
          oModel.setProperty("/profile/department", data.department || "");
          oModel.setProperty("/profile/manager", data.manager || "");
          oModel.setProperty("/profile/email", data.email || "");
          oModel.setProperty("/profile/phone", data.phone || "");
          oModel.setProperty("/profile/hireDate", data.hireDate || "");
          oModel.setProperty("/profile/yearsHere", that._calculateYearsHere(data.hireDate));
        })
        .catch(function () {
          MessageToast.show(oModel.getProperty("/texts/profileLoadError"));
        });
    },

    onOpenUserMenu: function (oEvent) {
      this.byId("userMenuPopover").openBy(oEvent.getSource());
    },

    onProfilePress: function () {
      this.byId("userMenuPopover").close();
      this.byId("profileDialog").open();
    },

    onCloseProfileDialog: function () {
      this.byId("profileDialog").close();
    },

    onOpenSettings: function () {
      this.byId("userMenuPopover").close();
      this.byId("settingsDialog").open();
    },

    onCloseSettingsDialog: function () {
      this.byId("settingsDialog").close();
    },

    onSaveSettings: function () {
      var oModel = this.getView().getModel("home");
      var sKey = oModel.getProperty("/selectedLanguage");
      var sBaseUrl = window.location.href.split("?")[0];
      window.location.href = sBaseUrl + "?sap-ui-language=" + sKey;
    },

    onLogoutPress: function () {
      this.byId("userMenuPopover").close();
      var oModel = this.getView().getModel("home");
      MessageToast.show(oModel.getProperty("/texts/logoutMessage"));
    },

    onOpenEmployees: function () {
      window.location.href = "/my.company.hr.employeeui/index.html";
    },

    onOpenLeaveRequests: function () {
      window.location.href = "/my.company.hr.leaverequestsui/index.html";
    },

    onOpenPromotions: function () {
      window.location.href = "/my.company.hr.promotionsui/index.html";
    },

    onOpenPromotionFeedbacks: function () {
      window.location.href = "/my.company.hr.promotionfeedbacksui/index.html";
    },

    onOpenNotifications: function () {
      window.location.href = "/my.company.hr.notificationsui/index.html";
    }
  });
});