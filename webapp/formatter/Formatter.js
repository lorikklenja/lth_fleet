sap.ui.define([

], function () {
    "use strict";
    return {
        statusHighlight: function (status) {
            switch (status) {
                case "In Service": return "Success";
                case "Out of Service": return "Error";
                case "Under Maintenance": return "Warning";
                case "Retired": return "Information";
                default: return "None";
            }
        },
        formatDate: function (date) {
            if (!date) {
                return "";
            }

            var date = new Date(date);

            var day = String(date.getDate()).padStart(2, "0");
            var month = String(date.getMonth() + 1).padStart(2, "0");
            var year = date.getFullYear();
            let hours = date.getHours();
            let minutes = String(date.getMinutes()).padStart(2, "0");
            let ampm = hours >= 12 ? "PM" : "AM";

            hours = hours % 12;
            hours = hours ? hours : 12;

            let time = hours + ":" + minutes + ampm;

            return day + "." + month + "." + year + " at " + time;
        },
        formatDateSince: function (date) {
            if (!date) return "";

            const start = new Date(date);
            const now = new Date();

            const diffMs = now - start;
            const diffMinutes = Math.floor(diffMs / 60000);

            if (diffMinutes < 1) {
                return "just now";
            }

            if (diffMinutes < 1440) {
                return diffMinutes + " minute" + (diffMinutes === 1 ? "" : "s") + " ago";
            }

            let years = now.getFullYear() - start.getFullYear();
            let months = now.getMonth() - start.getMonth();
            let days = now.getDate() - start.getDate();

            if (days < 0) {
                const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                days += prevMonth.getDate();
                months--;
            }

            if (months < 0) {
                months += 12;
                years--;
            }

            const parts = [];
            if (years > 0) parts.push(years + " year" + (years > 1 ? "s" : ""));
            if (months > 0) parts.push(months + " month" + (months > 1 ? "s" : ""));
            if (days > 0) parts.push(days + " day" + (days > 1 ? "s" : ""));

            return parts.join(" ") + " old";
        }

    };
});