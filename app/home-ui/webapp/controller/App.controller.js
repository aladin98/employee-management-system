sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Configuration",
  "sap/m/MessageBox"
], function (Controller, MessageToast, JSONModel, Configuration, MessageBox) {
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
        loginSubtitle: "Connectez-vous avec votre compte",
        resetSubtitle: "Définissez un nouveau mot de passe",
        login: "Connexion",
        password: "Mot de passe",
        newPassword: "Nouveau mot de passe",
        confirmPassword: "Confirmer le mot de passe",
        resetPassword: "Réinitialiser le mot de passe",
        backToLogin: "Retour à la connexion",
        showPassword: "Afficher le mot de passe",
        forgotPassword: "Mot de passe oublié ?",
        forgotPasswordSubtitle: "Saisissez votre e-mail pour recevoir un lien de réinitialisation.",
        sendResetLink: "Envoyer le lien",
        loginError: "Identifiants invalides",
        emailRequired: "Veuillez saisir votre e-mail",
        passwordRequired: "Veuillez saisir votre mot de passe",
        newPasswordRequired: "Veuillez saisir un nouveau mot de passe",
        confirmPasswordRequired: "Veuillez confirmer le mot de passe",
        passwordMismatch: "Les mots de passe ne correspondent pas",
        forgotPasswordError: "Impossible de traiter la demande de réinitialisation",
        resetPasswordError: "Impossible de réinitialiser le mot de passe",
        resetTokenMissing: "Le lien de réinitialisation est invalide ou incomplet",
        resetPasswordSuccess: "Mot de passe réinitialisé avec succès"
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
        loginSubtitle: "Sign in with your account",
        resetSubtitle: "Set your new password",
        login: "Sign In",
        password: "Password",
        newPassword: "New Password",
        confirmPassword: "Confirm Password",
        resetPassword: "Reset Password",
        backToLogin: "Back to Sign In",
        showPassword: "Show Password",
        forgotPassword: "Forgot Password?",
        forgotPasswordSubtitle: "Enter your email address to receive a reset link.",
        sendResetLink: "Send Reset Link",
        loginError: "Invalid credentials",
        emailRequired: "Please enter your email",
        passwordRequired: "Please enter your password",
        newPasswordRequired: "Please enter a new password",
        confirmPasswordRequired: "Please confirm the password",
        passwordMismatch: "Passwords do not match",
        forgotPasswordError: "Unable to process forgot password request",
        resetPasswordError: "Unable to reset password",
        resetTokenMissing: "Reset link is invalid or incomplete",
        resetPasswordSuccess: "Password reset successfully"
      };

      var oHomeModel = new JSONModel({
        texts: oTexts,
        isLoggedIn: false,
        isResetMode: false,
        resetToken: "",
        userName: "Demo User",
        role: "",
        department: "",
        selectedLanguage: sSelectedLanguage,
        loginEmail: "",
        loginPassword: "",
        forgotPasswordEmail: "",
        resetPassword: "",
        resetConfirmPassword: "",
        showPassword: false,
        showResetPassword: false,
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
      this._checkResetModeFromUrl();

      var sDemoUser = window.localStorage.getItem("demoUser");
      if (sDemoUser && !oHomeModel.getProperty("/isResetMode")) {
        oHomeModel.setProperty("/isLoggedIn", true);
        oHomeModel.setProperty("/loginEmail", sDemoUser);
        this._loadDashboardStats();
        this._loadCurrentProfile();
      }
    },

    _checkResetModeFromUrl: function () {
      var oModel = this.getView().getModel("home");
      var oParams = new URLSearchParams(window.location.search);
      var sToken = oParams.get("token");

      if (sToken) {
        oModel.setProperty("/isResetMode", true);
        oModel.setProperty("/resetToken", sToken);
      }
    },

    _extractResponseData: function (data) {
      if (data && typeof data === "object" && data.value !== undefined) {
        return data.value;
      }
      return data;
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

      fetch(sUrl, {
        headers: {
          "x-demo-user": window.localStorage.getItem("demoUser") || ""
        }
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Failed to load dashboard statistics");
          }
          return response.json();
        })
        .then(function (data) {
          data = this._extractResponseData(data);
          oModel.setProperty("/stats/employees", String(data.employees || 0));
          oModel.setProperty("/stats/leave", String(data.leaveRequests || 0));
          oModel.setProperty("/stats/promotions", String(data.promotions || 0));
          oModel.setProperty("/stats/notifications", String(data.notifications || 0));
        }.bind(this))
        .catch(function () {
          MessageToast.show(oModel.getProperty("/texts/statsLoadError"));
        });
    },

    _loadCurrentProfile: function () {
      var oModel = this.getView().getModel("home");
      var sUrl = window.location.origin + "/odata/v4/employee/getCurrentProfile()";
      var that = this;

      fetch(sUrl, {
        headers: {
          "x-demo-user": window.localStorage.getItem("demoUser") || ""
        }
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Failed to load user profile");
          }
          return response.json();
        })
        .then(function (data) {
          data = that._extractResponseData(data);
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

    onToggleShowPassword: function (oEvent) {
      this.getView().getModel("home").setProperty("/showPassword", oEvent.getParameter("selected"));
    },

    onToggleShowResetPassword: function (oEvent) {
      this.getView().getModel("home").setProperty("/showResetPassword", oEvent.getParameter("selected"));
    },

    onLoginPress: function () {
      var oModel = this.getView().getModel("home");
      var sEmail = (oModel.getProperty("/loginEmail") || "").trim();
      var sPassword = oModel.getProperty("/loginPassword");

      if (!sEmail) {
        MessageToast.show(oModel.getProperty("/texts/emailRequired"));
        return;
      }

      if (!sPassword) {
        MessageToast.show(oModel.getProperty("/texts/passwordRequired"));
        return;
      }

      var sUrl = window.location.origin + "/odata/v4/employee/login";

      fetch(sUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: sEmail,
          password: sPassword
        })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return {
              ok: response.ok,
              data: data
            };
          });
        })
        .then(function (result) {
          var data = this._extractResponseData(result.data);

          if (!result.ok || !data || data.success === false) {
            MessageBox.error((data && data.message) || oModel.getProperty("/texts/loginError"));
            return;
          }

          window.localStorage.setItem("demoUser", data.email || sEmail);
          oModel.setProperty("/isLoggedIn", true);
          oModel.setProperty("/loginPassword", "");
          oModel.setProperty("/loginEmail", data.email || sEmail);

          this._loadDashboardStats();
          this._loadCurrentProfile();
        }.bind(this))
        .catch(function () {
          MessageBox.error(oModel.getProperty("/texts/loginError"));
        });
    },

    onForgotPasswordPress: function () {
      var oModel = this.getView().getModel("home");
      var sEmail = oModel.getProperty("/loginEmail") || "";
      oModel.setProperty("/forgotPasswordEmail", sEmail);
      this.byId("forgotPasswordDialog").open();
    },

    onCloseForgotPasswordDialog: function () {
      this.byId("forgotPasswordDialog").close();
    },

    onSubmitForgotPasswordPress: function () {
      var oModel = this.getView().getModel("home");
      var sEmail = (oModel.getProperty("/forgotPasswordEmail") || "").trim();

      if (!sEmail) {
        MessageToast.show(oModel.getProperty("/texts/emailRequired"));
        return;
      }

      var sUrl = window.location.origin + "/odata/v4/employee/forgotPassword";

      fetch(sUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: sEmail
        })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return {
              ok: response.ok,
              data: data
            };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            throw new Error("Forgot password failed");
          }

          var oData = result.data;
          var sMessage = oData && oData.value ? oData.value : oModel.getProperty("/texts/sendResetLink");

          this.byId("forgotPasswordDialog").close();
          MessageBox.information(sMessage);
        }.bind(this))
        .catch(function () {
          MessageBox.error(oModel.getProperty("/texts/forgotPasswordError"));
        });
    },

    onResetPasswordPress: function () {
      var oModel = this.getView().getModel("home");
      var sToken = oModel.getProperty("/resetToken");
      var sPassword = oModel.getProperty("/resetPassword");
      var sConfirmPassword = oModel.getProperty("/resetConfirmPassword");

      if (!sToken) {
        MessageBox.error(oModel.getProperty("/texts/resetTokenMissing"));
        return;
      }

      if (!sPassword) {
        MessageToast.show(oModel.getProperty("/texts/newPasswordRequired"));
        return;
      }

      if (!sConfirmPassword) {
        MessageToast.show(oModel.getProperty("/texts/confirmPasswordRequired"));
        return;
      }

      if (sPassword !== sConfirmPassword) {
        MessageToast.show(oModel.getProperty("/texts/passwordMismatch"));
        return;
      }

      var sUrl = window.location.origin + "/odata/v4/employee/resetPassword";

      fetch(sUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: sToken,
          newPassword: sPassword
        })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return {
              ok: response.ok,
              data: data
            };
          });
        })
        .then(function (result) {
          var data = this._extractResponseData(result.data);

          if (!result.ok || (data && data.success === false)) {
            MessageBox.error((data && data.message) || oModel.getProperty("/texts/resetPasswordError"));
            return;
          }

          MessageBox.success((data && data.message) || oModel.getProperty("/texts/resetPasswordSuccess"), {
            onClose: function () {
              this._clearResetMode();
            }.bind(this)
          });
        }.bind(this))
        .catch(function () {
          MessageBox.error(oModel.getProperty("/texts/resetPasswordError"));
        });
    },

    onBackToLoginPress: function () {
      this._clearResetMode();
    },

    _clearResetMode: function () {
      var oModel = this.getView().getModel("home");
      oModel.setProperty("/isResetMode", false);
      oModel.setProperty("/resetToken", "");
      oModel.setProperty("/resetPassword", "");
      oModel.setProperty("/resetConfirmPassword", "");
      oModel.setProperty("/showResetPassword", false);

      var sBaseUrl = window.location.origin + window.location.pathname;
      var sQuery = new URLSearchParams(window.location.search);

      sQuery.delete("token");

      var sRemaining = sQuery.toString();
      var sNewUrl = sRemaining ? (sBaseUrl + "?" + sRemaining) : sBaseUrl;
      window.history.replaceState({}, document.title, sNewUrl);
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
      window.localStorage.removeItem("demoUser");

      var oModel = this.getView().getModel("home");
      oModel.setProperty("/isLoggedIn", false);
      oModel.setProperty("/isResetMode", false);
      oModel.setProperty("/resetToken", "");
      oModel.setProperty("/userName", "Demo User");
      oModel.setProperty("/role", "");
      oModel.setProperty("/department", "");
      oModel.setProperty("/loginEmail", "");
      oModel.setProperty("/loginPassword", "");
      oModel.setProperty("/forgotPasswordEmail", "");
      oModel.setProperty("/resetPassword", "");
      oModel.setProperty("/resetConfirmPassword", "");
      oModel.setProperty("/showPassword", false);
      oModel.setProperty("/showResetPassword", false);
      oModel.setProperty("/profile", {
        fullName: "",
        role: "",
        jobTitle: "",
        department: "",
        manager: "",
        email: "",
        phone: "",
        hireDate: "",
        yearsHere: ""
      });
      oModel.setProperty("/stats", {
        employees: "0",
        leave: "0",
        promotions: "0",
        notifications: "0"
      });
    },

    _getDemoUserParam: function () {
      var sUser = window.localStorage.getItem("demoUser") || "";
      return sUser ? ("?demoUser=" + encodeURIComponent(sUser)) : "";
    },

    onOpenEmployees: function () {
      window.location.href = "/my.company.hr.employeeui/index.html" + this._getDemoUserParam();
    },

    onOpenLeaveRequests: function () {
      window.location.href = "/my.company.hr.leaverequestsui/index.html" + this._getDemoUserParam();
    },

    onOpenPromotions: function () {
      window.location.href = "/my.company.hr.promotionsui/index.html" + this._getDemoUserParam();
    },

    onOpenPromotionFeedbacks: function () {
      window.location.href = "/my.company.hr.promotionfeedbacksui/index.html" + this._getDemoUserParam();
    },

    onOpenNotifications: function () {
      window.location.href = "/my.company.hr.notificationsui/index.html" + this._getDemoUserParam();
    }
  });
});