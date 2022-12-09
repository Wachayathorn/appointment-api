const admin = require("firebase-admin");
const functions = require('firebase-functions');
const serviceAccount = require('./Appointment.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://appointment-c8cfd.firebaseio.com"
});
const express = require('express');
const cors = require('cors');
const appAPI = express();
const bodyParser = require('body-parser');
const moment = require('moment');

// แจ้งเตือนอาจารย์ เมื่อมีการนัดหมาย //
exports.App_Teacher = functions.firestore.document('Appointment/{docId}').onCreate((snap, context) => {
    var Value = snap.data();
    var teacherID = Value.teacherID;
    var studentName = Value.name;
    var studentID = Value.student_ID;
    var date = Value.date;
    var time = Value.time;

    var db = admin.database();
    var ref = db.ref("Users-Teacher");
    return ref.child(teacherID).once("value", function (snapshot) {
        if (teacherID === "20" || teacherID === "30") {
            return console.log("นัดหมายฝ่ายธุรการหรือฝ่ายบริการ");
        } else {
            var dataTeacher = snapshot.val();
            var token = dataTeacher.Token;
            var notification = dataTeacher.Notification;
            if (notification === null || notification === "off") {
                return console.log(teacher + " ปิดการแจ้งเตือน");
            } else {
                var message = {
                    notification: {
                        title: 'Appointment',
                        body: 'มีการนัดหมายขอเข้าพบจากนักศึกษาชื่อ : ' + studentName + ' รหัส : ' + studentID + ' วันที่ : ' + date + ' เวลา : ' + time,
                        sound: 'default',
                        android_channel_id: 'app_channel'
                    }
                };
                var options = {
                    priority: 'high'
                };
                admin.messaging().sendToDevice(token, message, options).then(function (response) {
                    console.log('Successfully sent message:', response);
                    return true;
                })
                    .catch(function (error) {
                        console.log('Error sending message:', error);
                    });
            }
        }
    });
});

// แจ้งเตือนนักศึกษา //
exports.App_Student = functions.firestore.document('Appointment/{docId}').onUpdate((change, context) => {
    var newValue = change.after.data();
    var statusStudent = newValue.status;
    var teacherName = newValue.teacher;
    var student_id = newValue.student_ID;
    var declineReason = newValue.declineReason;
    var db = admin.database();
    var ref = db.ref("Users-Student");

    return ref.child(student_id).once("value", function (snapshot) {
        var dataStudent = snapshot.val();
        var token = dataStudent.Token;
        if (statusStudent === "ดำเนินเอกสารเสร็จสิ้น") {
            var message_1 = {
                notification: {
                    title: 'Appointment',
                    body: 'ดำเนินการเอกสารของคุณเสร็จสิ้นแล้ว กรุณามารับเอกสารของคุณได้ที่เจ้าหน้าที่ฝ่ายธุรการ',
                    sound: 'default',
                    android_channel_id: 'app_channel'
                }
            };
            var options_1 = {
                priority: 'high'
            };
            admin.messaging().sendToDevice(token, message_1, options_1).then(function (response) {
                console.log('Successfully sent message:', response);
                return;
            })
                .catch(function (error) {
                    console.log('Error sending message:', error);
                });
        } else if (statusStudent === "อนุมัติ") {
            var message_2 = {
                notification: {
                    title: 'Appointment',
                    body: teacherName + ' ได้อนุมัติการนัดหมายของคุณแล้ว กรุณามาเข้าพบให้ตรงตามเวลาที่ได้นัดหมาย',
                    sound: 'default',
                    android_channel_id: 'app_channel'
                }
            };
            var options_2 = {
                priority: 'high'
            };
            admin.messaging().sendToDevice(token, message_2, options_2).then(function (response) {
                console.log('Successfully sent message:', response);
                return;
            })
                .catch(function (error) {
                    console.log('Error sending message:', error);
                });
        } else if (statusStudent === "ปฏิเสธ") {
            var message_3 = {
                notification: {
                    title: 'Appointment',
                    body: teacherName + ' ได้ปฏิเสธการนัดหมาย เนื่องจาก : ' + declineReason,
                    sound: 'default',
                    android_channel_id: 'app_channel'
                }
            };
            var options_3 = {
                priority: 'high'
            };
            admin.messaging().sendToDevice(token, message_3, options_3).then(function (response) {
                console.log('Successfully sent message:', response);
                return;
            })
                .catch(function (error) {
                    console.log('Error sending message:', error);
                });
        } else {
            console.log("Not match status");
        }
    });
});

exports.Message_Student = functions.firestore.document('Message/{docId}').onCreate((snap, context) => {
    var Value = snap.data();
    var studentID = Value.student_ID;
    var teacherName = Value.teacherName;
    var title = Value.title;

    if (Value.teacherRole === "ฝ่ายธุรการ") {
        teacherName = Value.teacherRole;
    }

    var ref = admin.database().ref("Users-Student");
    var sending = new Promise((resolve, reject) => {
        for (var i = 0; i < studentID.length; i++) {
            ref.child(studentID[i]).once("value", function (snapshot) {
                var data = snapshot.val();
                if (data) {
                    var token = data.Token;
                    if (token !== "-") {
                        var message = {
                            notification: {
                                title: 'Appointment',
                                body: 'มีการนัดหมายจาก ' + teacherName + ' เรื่อง : ' + title,
                                sound: 'default',
                                android_channel_id: 'app_channel'
                            }
                        };
                        var options = {
                            priority: 'high'
                        };
                        admin.messaging().sendToDevice(token, message, options).then(function (response) {
                            console.log('Successfully sent message:', response);
                            return;
                        })
                            .catch(function (error) {
                                console.log('Error sending message:', error);
                            });
                    } else {
                        console.log("ไม่มี Token");
                    }
                }
                if (i === studentID.length - 1) {
                    resolve("OK");
                }
            });
        }
    });
    Promise.all([sending]).then(values => {
        if (values) {
            return console.log("ส่งการแจ้งเตือนเสร็จสิ้น");
        }
        return true;
    }).catch(function () {
        console.log("Send message promise error");
    })
    return true;
});

exports.Clear_Message = functions.pubsub.schedule('59 23 * * 0-6').timeZone('Asia/Bangkok').onRun((context) => {
    var today = moment().format("DD/MM/YYYY");
    var myref = admin.firestore().collection("Message");

    return myref.where('enddate', '==', today).get().then((snapshot) => {
        if (snapshot.empty) {
            console.log("ไม่มีการนัดหมายสิ้นสุดในเวลานี้");
            return;
        }

        var sort1 = new Promise((resolve, reject) => {
            for (var i = 0; i < snapshot.docs.length; i++) {
                var data = snapshot.docs[i].data();
                myref.doc(data.note_ID).update({
                    "status": "0",
                })
                if (i === snapshot.docs.length - 1) {
                    resolve("OK");
                }
            }
        });
        Promise.all([sort1]).then(values => {
            if (values) {
                return true;
            }
            return true;
        }).catch(function () {
            console.log("Clear message promise error");
        })
        return true;
    }).catch(function () {
        console.log("Getting document error");
    })
});

// แจ้งเตือนก่อนเข้าพบทุกวัน 8 โมง
exports.App_All_Day = functions.pubsub.schedule('0 8 * * 1-5').timeZone('Asia/Bangkok').onRun((context) => {
    var today = moment().format("DD/MM/YYYY");
    var fireStore = admin.firestore();
    var myref = fireStore.collection("Appointment");
    return myref.where('date', '==', today).where('status', '==', 'อนุมัติ').get().then(snapshot => {
        if (snapshot.empty) {
            console.log('ไม่มีการนัดหมายในวันนี้');
            return;
        }
        snapshot.forEach(doc => {
            var list = doc.data();
            var nameStudent = list.name;
            var nameTeacher = list.teacher;
            var idTeacher = list.teacherID;
            var idStudent = list.student_ID;
            var timeApp = list.time;

            var db = admin.database();
            var refStudent = db.ref("Users-Student");
            refStudent.child(idStudent).once("value", function (snapshot) {
                var dataStudent = snapshot.val();
                var tokenStudent = dataStudent.Token;
                var message = {
                    notification: {
                        title: 'Appointment',
                        body: 'คุณมีการนัดหมายในวันนี้เวลา ' + timeApp + ' กับ ' + nameTeacher,
                        sound: 'default',
                        android_channel_id: 'app_channel'
                    }
                };
                var options = {
                    priority: 'high'
                };
                admin.messaging().sendToDevice(tokenStudent, message, options).then(function (response) {
                    console.log('Successfully sent message:', response);
                    return;
                })
                    .catch(function (error) {
                        console.log('Error sending message:', error);
                    });
            })

            var refTeacher = db.ref("Users-Teacher");
            refTeacher.child(idTeacher).once("value", function (snapshot) {
                if (snapshot.val() !== null) {
                    var dataTeacher = snapshot.val();
                    var tokenTeacher = dataTeacher.Token;
                    var notification = dataTeacher.Notification;
                    if (notification === null || notification === "off") {
                        console.log(nameTeacher + " ปิดการแจ้งเตือน");
                    } else {
                        if (tokenTeacher !== "-") {
                            var message = {
                                notification: {
                                    title: 'Appointment',
                                    body: 'คุณมีการนัดหมายในวันนี้เวลา ' + timeApp + ' กับ ' + nameStudent,
                                    sound: 'default',
                                    android_channel_id: 'app_channel'
                                }
                            };
                            var options = {
                                priority: 'high'
                            };
                            admin.messaging().sendToDevice(tokenTeacher, message, options).then(function (response) {
                                console.log('Successfully sent message:', response);
                                return;
                            })
                                .catch(function (error) {
                                    console.log('Error sending message:', error);
                                });
                        } else {
                            console.log("ไม่มี Token");
                        }
                    }
                } else {
                    console.log("นัดหมายฝ่ายธุรการหรือฝ่ายบริการ");
                }
            })
        });
        return true;
    })
        .catch(err => {
            console.log('Error getting documents', err);
        });
});

// แจ้งเตือนก่อนเข้าพบ 1 ชั่วโมง
exports.App_All_Day_Every_Hours = functions.pubsub.schedule('0 9-16 * * 1-5').timeZone('Asia/Bangkok').onRun((context) => {
    var asiaTime = new Date().toLocaleString("en-US", { timeZone: 'Asia/Bangkok' });
    var timeCurrent = (new Date(asiaTime)).toUTCString();
    var section_a = timeCurrent.substring(0, 17);
    var section_b = "";
    var section_c = "";
    var _time = timeCurrent.substring(17, 19);

    var _cal = parseInt(_time) + 1;
    section_b = (_cal - 7).toString() + ":00:00 GMT";
    section_c = (_cal - 6).toString() + ":00:00 GMT";

    var _timeMillisStart = Date.parse(section_a + section_b);
    var _timeMillisEnd = Date.parse(section_a + section_c);

    var fireStore = admin.firestore();
    var myref = fireStore.collection("Appointment");
    return myref.where('status', '==', 'อนุมัติ').where('dateMillis', '>=', _timeMillisStart).where('dateMillis', '<', _timeMillisEnd).get().then(snapshot => {
        if (snapshot.empty) {
            console.log('ไม่มีการนัดหมายใน 1 ชั่วโมงข้างหน้า');
            return;
        }
        snapshot.forEach(doc => {
            var list = doc.data();
            var nameStudent = list.name;
            var nameTeacher = list.teacher;
            var idTeacher = list.teacherID;
            var idStudent = list.student_ID;
            var timeApp = list.time;

            var db = admin.database();
            var refStudent = db.ref("Users-Student");
            refStudent.child(idStudent).once("value", function (snapshot) {
                var dataStudent = snapshot.val();
                var tokenStudent = dataStudent.Token;
                var message = {
                    notification: {
                        title: 'Appointment',
                        body: 'คุณมีการนัดหมายในวันนี้เวลา ' + timeApp + ' กับ ' + nameTeacher,
                        sound: 'default',
                        android_channel_id: 'app_channel'
                    }
                };
                var options = {
                    priority: 'high'
                };
                admin.messaging().sendToDevice(tokenStudent, message, options).then(function (response) {
                    console.log('Successfully sent message:', response);
                    return;
                })
                    .catch(function (error) {
                        console.log('Error sending message:', error);
                    });
            })

            var refTeacher = db.ref("Users-Teacher");
            refTeacher.child(idTeacher).once("value", function (snapshot) {
                if (snapshot.val() !== null) {
                    var dataTeacher = snapshot.val();
                    var tokenTeacher = dataTeacher.Token;
                    var notification = dataTeacher.Notification;
                    if (notification === null || notification === "off") {
                        console.log(nameTeacher + " ปิดการแจ้งเตือน");
                    } else {
                        if (tokenTeacher !== "-") {
                            var message = {
                                notification: {
                                    title: 'Appointment',
                                    body: 'คุณมีการนัดหมายในวันนี้เวลา ' + timeApp + ' กับ ' + nameStudent,
                                    sound: 'default',
                                    android_channel_id: 'app_channel'
                                }
                            };
                            var options = {
                                priority: 'high'
                            };
                            admin.messaging().sendToDevice(tokenTeacher, message, options).then(function (response) {
                                console.log('Successfully sent message:', response);
                                return;
                            })
                                .catch(function (error) {
                                    console.log('Error sending message:', error);
                                });
                        } else {
                            console.log("ไม่มี Token");
                        }
                    }
                } else {
                    console.log("นัดหมายฝ่ายธุรการหรือฝ่ายบริการ");
                }
            })
        });
        return true;
    })
        .catch(err => {
            console.log('Error getting documents', err);
        });
});

exports.Clear_Timetable = functions.pubsub.schedule('0 0 * * 0').timeZone('Asia/Bangkok').onRun((context) => {
    var db = admin.firestore();
    var refTimetable = db.collection('Timetable');
    var refTimetable_backup = db.collection('Timetable-backup');
    return refTimetable.get().then(snapshot => {
        return snapshot.forEach(doc => {
            doc.ref.delete();
        });
    }).catch(function () {
        console.log('Delete timetable error');
    }).then(function () {
        return refTimetable_backup.get().then(snapshot => {
            return snapshot.forEach(doc => {
                console.log("Set document : " + doc.id);
                refTimetable.doc(doc.id).set(doc.data());
            });
        }).catch(function () {
            console.log("Getting timetable-backup error");
        }).then(function () {
            console.log("Clear timetable success");
            return true;
        }).catch(function () {
            console.log("Clear timetable error");
        })
    }).catch(function () {
        console.log("Connect timetable-backup error");
    })
});

// Servire Update อนุมัติ to เสร็จสิ้น //
exports.Update_Status_Finished = functions.pubsub.schedule('1 10-18 * * 1-5').timeZone('Asia/Bangkok').onRun((context) => {
    var asiaTime = new Date().toLocaleString("en-US", { timeZone: 'Asia/Bangkok' });
    var timeCurrent = (new Date(asiaTime)).toUTCString();
    var section_a = timeCurrent.substring(0, 17);
    var section_b = "";
    var section_c = "";
    var _time = timeCurrent.substring(17, 19);

    var _cal = parseInt(_time) - 1;
    section_b = (_cal - 7).toString() + ":00:00 GMT";
    section_c = (_cal - 6).toString() + ":00:00 GMT";

    var _timeMillisStart = Date.parse(section_a + section_b);
    var _timeMillisEnd = Date.parse(section_a + section_c);

    var fireStore = admin.firestore();
    var myref = fireStore.collection("Appointment");
    return myref.where('status', '==', 'อนุมัติ').where('dateMillis', '>=', _timeMillisStart).where('dateMillis', '<', _timeMillisEnd).get().then(snapshot => {
        if (snapshot.empty) {
            console.log('ไม่มีการนัดหมายที่อนุมัติในชั่วโมงที่ผ่านมา');
            return;
        }
        snapshot.forEach(doc => {
            var list = doc.data();
            var note = list.note_ID;
            var updateStatus = myref.doc(note);
            updateStatus.update({ status: "อนุมัติ(เสร็จสิ้น)" });
        });
        return true;
    })
        .catch(err => {
            console.log('Error getting documents', err);
        });
});

// Clear การนัดหมายที่ไม่มีการตอบรับ
exports.App_Clear = functions.pubsub.schedule('2 10-18 * * 1-5').timeZone('Asia/Bangkok').onRun((context) => {
    var asiaTime = new Date().toLocaleString("en-US", { timeZone: 'Asia/Bangkok' });
    var timeCurrent = (new Date(asiaTime)).toUTCString();
    var section_a = timeCurrent.substring(0, 17);
    var section_b = "";
    var section_c = "";
    var _time = timeCurrent.substring(17, 19);

    var _cal = parseInt(_time) - 1;
    section_b = (_cal - 7).toString() + ":00:00 GMT";
    section_c = (_cal - 6).toString() + ":00:00 GMT";

    var _timeMillisStart = Date.parse(section_a + section_b);
    var _timeMillisEnd = Date.parse(section_a + section_c);

    var fireStore = admin.firestore();
    var myref = fireStore.collection("Appointment");
    return myref.where('status', '==', 'รอการตอบรับ').where('dateMillis', '>=', _timeMillisStart).where('dateMillis', '<', _timeMillisEnd).get().then(snapshot => {
        if (snapshot.empty) {
            console.log('ไม่มีการนัดหมายที่ไม่ได้ตอบรับ');
            return;
        }
        snapshot.forEach(doc => {
            var list = doc.data();
            var note = list.note_ID;
            var clearApp = myref.doc(note);
            clearApp.update({ status: "ไม่มีการตอบรับ" });
        });
        return true;
    })
        .catch(err => {
            console.log('Error getting documents', err);
        });
});

// แจ้งเตือนคืนอุปกรณ์
exports.Alert_Return_Tool = functions.pubsub.schedule('15 8 * * 0-6').timeZone('Asia/Bangkok').onRun((context) => {
    var fireStore = admin.firestore();
    var myref = fireStore.collection("Appointment");
    var timeToday = moment().format("DD/MM/YYYY");
    return myref.where('status', '==', 'กำลังยืมอุปกรณ์').where('dateBack', "==", timeToday).get().then(snapshot => {
        if (snapshot.empty) {
            console.log('ไม่มีรายการที่ต้องคืนในวันนี้');
            return;
        }

        var db = admin.database();
        var ref = db.ref("Users-Student");
        snapshot.forEach(doc => {
            var list = doc.data();
            var idStudent = list.student_ID;
            var tool = list.tool;

            ref.child(idStudent).once("value", function (snapshot) {
                var dataStudent = snapshot.val();
                var token = dataStudent.Token;
                var message = {
                    notification: {
                        title: 'Appointment',
                        body: 'คืนอุปกรณ์ - วันที่ ' + timeToday + ' ครบกำหนดคืนอุปกรณ์ที่ยืมไป ดังนี้ : ' + tool + ' ส่งคืนได้ที่เจ้าหน้าที่ฝ่ายบริการ',
                        sound: 'default',
                        android_channel_id: 'app_channel'
                    }
                };
                var options = {
                    priority: 'high'
                };
                admin.messaging().sendToDevice(token, message, options).then(function (response) {
                    console.log('Successfully sent message:', response);
                    return;
                })
                    .catch(function (error) {
                        console.log('Error sending message:', error);
                    });
            })
            return true;
        })
        return true;
    }).catch(err => {
        console.log('Firestore query error ! ', err);
    })
});

//////////////////////////////////////////////// Backend API ////////////////////////////////////////////////////////////////////////////
appAPI.use(cors({ origin: true }));
appAPI.use(bodyParser.json());
appAPI.use(bodyParser.urlencoded({ extended: true }));

appAPI.post('/login', (req, res) => {
    console.log("API : เข้าสู่ระบบ");
    var resData = '';
    var user = req.body.username;

    var db = admin.database();
    var ref = db.ref("Users-Teacher");
    ref.orderByChild("Username").equalTo(user).once("value", function (snapshot) {
        resData = snapshot.val();
        res.send(resData);
    });
});

appAPI.post('/dash', (req, res) => {
    console.log("API : แดชบอร์ด");
    var uID = req.body.uID;
    var timeToday = req.body.time;
    var role = req.body.role;
    var resData = {};
    var arrayApp = [];
    var countAccept = 0;
    var countDecline = 0;
    var countProcess = 0;

    var db = admin.firestore();
    if (role === "อาจารย์") {
        db.collection("Appointment").where("teacherID", "==", uID).where("date", "==", timeToday.toString()).orderBy("timestamp", "desc")
            .get()
            .then((snapshot) => {
                resData.allApp = snapshot.size;
                var listcount = 0;
                snapshot.docs.forEach(doc => {
                    if (listcount < 5) {
                        arrayApp.push(doc.data());
                        listcount++;
                    }

                    if (doc.data().status === "อนุมัติ" || doc.data().status === "อนุมัติ(เสร็จสิ้น)") {
                        countAccept++;
                    } else if (doc.data().status === "ปฏิเสธ" || doc.data().status === "ปฏิเสธ(เสร็จสิ้น)") {
                        countDecline++;
                    }
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = arrayApp;
                resData.allAccept = countAccept;
                resData.allDecline = countDecline;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    }
    else if (role === "ฝ่ายธุรการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายธุรการ").where("date", "==", timeToday.toString()).orderBy("timestamp", "desc")
            .get()
            .then((snapshot) => {
                resData.allApp = snapshot.size;
                var listcount = 0;
                snapshot.docs.forEach(doc => {
                    if (listcount < 5) {
                        arrayApp.push(doc.data());
                        listcount++;
                    }

                    if (doc.data().status === "อนุมัติ" || doc.data().status === "อนุมัติ(เสร็จสิ้น)") {
                        countAccept++;
                    } else if (doc.data().status === "ปฏิเสธ" || doc.data().status === "ปฏิเสธ(เสร็จสิ้น)") {
                        countDecline++;
                    } else if (doc.data().status === "กำลังดำเนินเอกสาร") {
                        countProcess++;
                    }
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = arrayApp;
                resData.allAccept = countAccept;
                resData.allDecline = countDecline;
                resData.allProcess = countProcess;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายบริการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายบริการ").where("date", "==", timeToday.toString()).orderBy("timestamp", "desc")
            .get()
            .then((snapshot) => {
                resData.allApp = snapshot.size;
                var listcount = 0;
                snapshot.docs.forEach(doc => {
                    if (listcount < 5) {
                        arrayApp.push(doc.data());
                        listcount++;
                    }

                    if (doc.data().status === "อนุมัติ" || doc.data().status === "อนุมัติ(เสร็จสิ้น)") {
                        countAccept++;
                    } else if (doc.data().status === "ปฏิเสธ" || doc.data().status === "ปฏิเสธ(เสร็จสิ้น)") {
                        countDecline++;
                    } else if (doc.data().status === "กำลังยืมอุปกรณ์") {
                        countProcess++;
                    }
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = arrayApp;
                resData.allAccept = countAccept;
                resData.allDecline = countDecline;
                resData.allProcess = countProcess;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "แอดมิน") {
        var allTeacher = 0;
        var allManage = 0;
        var allService = 0;
        var allStudent = 0;

        var RTDB = admin.database();
        var refTeacher = RTDB.ref("Users-Teacher");
        var refStudent = RTDB.ref("Users-Student");

        var query1 = new Promise((resolve, reject) => {
            refTeacher.once("value", function (snapshot) {
                snapshot.forEach(function (childSnapshot) {
                    var childData = childSnapshot.val();
                    if (childData.Role === "อาจารย์") {
                        allTeacher++;
                    } else if (childData.Role === "ฝ่ายธุรการ") {
                        allManage++;
                    } else if (childData.Role === "ฝ่ายบริการ") {
                        allService++;
                    }
                });
                resData.allTea = allTeacher;
                resData.allMa = allManage;
                resData.allSer = allService;
                resolve("OK");
            })
        });
        var query2 = new Promise((resolve, reject) => {
            refStudent.once("value", function (snapshot) {
                allStudent = snapshot.numChildren();
                resData.allStu = allStudent;
                resolve("OK");
            })
        });
        Promise.all([query1, query2]).then(values => {
            if (values) {
                if (values[0] === "OK" && values[1] === "OK") {
                    res.send(resData);
                }
            }
            return true;
        }).catch(function () {
            console.log("Query dashboard admin promise error");
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestNameTeacherRTDB', (req, res) => {
    console.log("API : รายชื่ออาจารย์ RTDB");
    var resData = {};
    var roleAdmin = req.body.roleAdmin;

    if (roleAdmin === "แอดมิน") {
        var RTDB = admin.database();
        var ref = RTDB.ref("Users-Teacher");
        ref.once("value", function (snapshot) {
            var arrayName = [];
            var arrayuID = [];
            snapshot.forEach(function (childSnapshot) {
                var childData = childSnapshot.val();
                if (childData.Role === "อาจารย์") {
                    var _name = childData.Name_prefix + childData.Name;
                    var _uid = childData.uID;
                    arrayName.push(_name);
                    arrayuID.push(_uid);
                }
            })
            resData.allTeacherName = arrayName;
            resData.alluID = arrayuID;
            res.send(resData);
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestlist', (req, res) => {
    console.log("API : รายการนัดหมาย");
    var resData = {};
    var allAppointment = [];
    var uID = req.body.uID;
    var role = req.body.role;

    var db = admin.firestore();

    if (role === "อาจารย์") {
        db.collection("Appointment").where("teacherID", "==", uID).where("status", "==", "รอการตอบรับ").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายธุรการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายธุรการ").where("status", "==", "รอการตอบรับ").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายบริการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายบริการ").where("status", "==", "รอการตอบรับ").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/accept', (req, res) => {
    console.log("API : อัพเดทสถานะอนุมัติ");
    var dataNote = req.body.appID;
    var db = admin.firestore();

    var note_ID = dataNote.split(',');
    var updateStatus = db.collection("Appointment").doc(note_ID[0]);
    updateStatus.update({ status: "อนุมัติ" }).then(function () {
        res.send("Accept success");
        console.log("Update accept success");
        return true;
    }).catch(function (error) {
        console.log("Update status fail !");
    })
});

appAPI.post('/decline', (req, res) => {
    console.log("API : อัพเดทสถานะปฏิเสธ");

    var dataNote = req.body.appID;
    var reason = req.body.reasonDecline;
    var db = admin.firestore();

    var data = dataNote.split(',');
    var updateStatus = db.collection("Appointment").doc(data[0]);
    updateStatus.update({ status: "ปฏิเสธ", declineReason: reason }).then(function () {
        console.log("Update decline success");
        var myref = db.collection("Timetable").doc(data[1] + "_" + data[2]);
        myref.update(data[3], false).then(function () {
            console.log("Update time success");
            res.send("Decline success");
            return true;
        }).catch(function (error) {
            console.log(error);
        })
        return true;
    }).catch(function (error) {
        console.log("Update status : fail !");
    })
    return true;
});

appAPI.post('/requestAccept', (req, res) => {
    console.log("API : รายการที่อนุมัติ");
    var resData = {};
    var allAppointment = [];
    var uID = req.body.uID;
    var role = req.body.role;

    var db = admin.firestore();
    if (role === "อาจารย์") {
        db.collection("Appointment").where("teacherID", "==", uID).where("status", "==", "อนุมัติ").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายธุรการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายธุรการ").where("status", "==", "อนุมัติ").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายบริการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายบริการ").where("status", "==", "อนุมัติ").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestDecline', (req, res) => {
    console.log("API : รายการที่ปฏิเสธ");
    var resData = {};
    var allAppointment = [];
    var uID = req.body.uID;
    var role = req.body.role;

    var db = admin.firestore();
    if (role === "อาจารย์") {
        db.collection("Appointment").where("teacherID", "==", uID).where("status", "==", "ปฏิเสธ").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายธุรการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายธุรการ").where("status", "==", "ปฏิเสธ").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายบริการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายบริการ").where("status", "==", "ปฏิเสธ").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/process', (req, res) => {
    console.log("API : อัพเดทสถานะรายการที่กำลังดำเนินงาน");
    var role = req.body.role;
    var note = req.body.note_id;
    var barcode = req.body.barcode;

    var db = admin.firestore();
    if (role === "ฝ่ายธุรการ") {
        db.collection("Barcode").where("data", "==", barcode).get().then(snapshot => {
            if (snapshot.empty) {
                res.send("No barcode id");
                return;
            } else {
                db.collection("Appointment").where("barcode", "==", barcode).get().then(snapshot => {
                    if (snapshot.empty) {
                        var updateStatus = db.collection("Appointment").doc(note);
                        updateStatus.update({
                            barcode: barcode,
                            status: "กำลังดำเนินเอกสาร",
                        }).then(function () {
                            res.send("OK");
                            return true;
                        }).catch(function () {
                            console.log("Update process document error");
                        })
                    } else {
                        res.send("Using");
                    }
                    return true;
                }).catch(function (err) {
                    console.log(err);
                })
            }
            return true;
        })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            })
    } else if (role === "ฝ่ายบริการ") {
        var updateBorrow = db.collection("Appointment").doc(note);
        updateBorrow.update({ status: "กำลังยืมอุปกรณ์" }).then(function () {
            res.send("Process borrow success");
            return true;
        }).catch(function (error) {
            console.log("Update borrow : fail !");
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestProcess', (req, res) => {
    console.log("API : รายการที่กำลังดำเนินงาน");
    var resData = {};
    var allAppointment = [];
    var role = req.body.role;

    var db = admin.firestore();
    if (role === "ฝ่ายธุรการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายธุรการ").where("status", "==", "กำลังดำเนินเอกสาร").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายบริการ") {
        db.collection("Appointment").where("teacher", "==", "ฝ่ายบริการ").where("status", "==", "กำลังยืมอุปกรณ์").orderBy("timestamp")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/processFinished', (req, res) => {
    console.log("API : อัพเดทสถานะรายการที่ดำเนินเอกสารเสร็จสิ้น");

    var role = req.body.role;
    var note = req.body.note_id;
    var type = req.body.type;
    var finishedDate = req.body.date;
    var finishedDateMillis = parseInt(req.body.dateMillis);
    var barcode = req.body.barcode_id;

    var db = admin.firestore();
    if (role === "ฝ่ายธุรการ") {
        if (type === "1") {
            var updateFinished = db.collection("Appointment").doc(note);
            updateFinished.update({
                status: "ดำเนินเอกสารเสร็จสิ้น",
                processFinishedDate: finishedDate,
                processFinishedDateMillis: finishedDateMillis,
                barcode: null,
            }).then(function () {
                res.send("Process document success");
                return true;
            }).catch(function (error) {
                console.log("Update process document : fail !");
            })
        } else if (type === "2") {
            db.collection("Appointment").where("barcode", "==", barcode).get()
                .then(function (snapshot) {
                    if (snapshot.empty) {
                        res.send("No barcode id");
                        return;
                    } else {
                        snapshot.forEach(doc => {
                            db.collection("Appointment").doc(doc.id).update({
                                status: "ดำเนินเอกสารเสร็จสิ้น",
                                processFinishedDate: finishedDate,
                                processFinishedDateMillis: finishedDateMillis,
                                barcode: null,
                            }).then(function () {
                                res.send("Process document success");
                                return true;
                            }).catch(function (error) {
                                console.log("Update process document : fail !");
                            })
                        })
                    }
                    return true;
                })
                .catch(function (error) {
                    console.log("Error getting documents: ", error);
                });
        }
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/excelTeacher', (req, res) => {
    console.log("API : แบบฟอร์มการนัดหมายอาจารย์");
    var resData = {};
    var role = req.body.role;
    var note = req.body.note_id;

    var db = admin.firestore();
    if (role === "อาจารย์") {
        var docRef = db.collection("Appointment").doc(note);
        docRef.get().then(function (doc) {
            if (doc.exists) {
                resData.nameStudent = doc.data().name;
                resData.student_id = doc.data().student_ID;
                resData.nameTeacher = doc.data().teacher;
                resData._topic = doc.data().topic;
                resData._detail = doc.data().detail;
                res.send(resData);
            }
            return true;
        }).catch(function (error) {
            console.log("Error getting documents: ", error);
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/excelService', (req, res) => {
    console.log("API : แบบฟอร์มการยืม-คืนอุปกรณ์");
    var resData = {};
    var role = req.body.role;
    var note = req.body.note_id;

    var db = admin.firestore();
    if (role === "ฝ่ายบริการ") {
        var docRef = db.collection("Appointment").doc(note);
        docRef.get().then(function (doc) {
            if (doc.exists) {
                resData.nameStudent = doc.data().name;
                resData.student_id = doc.data().student_ID;
                resData._topic = doc.data().topic;
                resData.purpose = doc.data().purpose;
                resData.dateBackExcel = doc.data().dateBack;
                resData.toolExcel = doc.data().tool;
                resData.toolNumberExcel = doc.data().toolNumber;
                resData.dateBorrowExcel = doc.data().date;
                res.send(resData);
            }
            return true;
        }).catch(function (error) {
            console.log("Error getting documents: ", error);
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/processToolBack', (req, res) => {
    console.log("API : อัพเดทสถานะคืนอุปกรณ์");
    var role = req.body.role;
    var note = req.body.note_id;
    var time = req.body.time;
    var timeBackMillis = parseInt(req.body.timeBackMillis);
    var db = admin.firestore();
    if (role === "ฝ่ายบริการ") {
        if (time === "ตรงเวลา") {
            var ref_1 = db.collection("Appointment").doc(note);
            ref_1.update({ status: "คืนอุปกรณ์แล้ว(ตรงเวลา)", timeBackMillis: timeBackMillis, }).then(function () {
                res.send("Success on time");
                return true;
            }).catch(function (error) {
                console.log("Update tool back : fail !");
            })
        } else if (time === "ล่าช้า") {
            var ref_2 = db.collection("Appointment").doc(note);
            ref_2.update({ status: "คืนอุปกรณ์แล้ว(ล่าช้า)", timeBackMillis: timeBackMillis, }).then(function () {
                res.send("Success late time");
                return true;
            }).catch(function (error) {
                console.log("Update tool back : fail !");
            })
        }
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestSetBarcode', (req, res) => {
    console.log("API : ชุดบาร์โค้ด");
    var role = req.body.role;
    var resData = {};
    var arrayDoc = [];

    if (role === "ฝ่ายธุรการ") {
        admin.firestore().collection("Barcode").get().then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
                arrayDoc.push(doc.data());
            });
            return true;
        }).catch(function () {
            console.log("Getting barcode error");
        }).then(function () {
            resData.Data = arrayDoc;
            res.send(resData);
            return true;
        }).catch(function () {
            console.log("Return error");
        })
    }
});

appAPI.post('/createBarcode', (req, res) => {
    console.log("API : สร้างบาร์โค้ด");
    var role = req.body.role;
    var data = req.body.data;
    var setBarcode = req.body.set;

    if (role === "ฝ่ายธุรการ") {
        var db = admin.firestore();
        if (data.length === 50) {
            for (var i = 0; i < data.length; i++) {
                var ref = db.collection("Barcode").doc();
                ref.set({
                    id: ref.id,
                    set: setBarcode,
                    data: data[i]["data"],
                    create_time: data[i]["create_time"],
                })
                if (i === data.length - 1) {
                    res.send("Create barcode success");
                }
            }
        } else {
            res.send("ERROR API");
        }
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestBarcode', (req, res) => {
    console.log("API : บาร์โค้ด");
    var resData = {};
    var allBarcode = [];
    var role = req.body.role;
    var setBarcode = req.body.set;

    if (role === "ฝ่ายธุรการ") {
        var db = admin.firestore();
        db.collection("Barcode").where("set", "==", setBarcode).orderBy("create_time")
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allBarcode.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allBarcode = allBarcode;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/deleteBarcode', (req, res) => {
    console.log("API : ลบบาร์โค้ด");
    var role = req.body.role;
    var barcodeID = req.body.arrayID;

    if (role === "ฝ่ายธุรการ") {
        var db = admin.firestore();
        for (i = 0; i < barcodeID.length; i++) {
            db.collection("Barcode").doc(barcodeID[i]).delete();
            if (i === barcodeID.length - 1) {
                res.send("OK");
            }
        }
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestHistory', (req, res) => {
    console.log("API : ประวัติการนัดหมาย");
    var resData = {};
    var allAppointment = [];
    var uID = req.body.uID;
    var role = req.body.role;
    var type = req.body.type;
    var startdate = parseInt(req.body.startdate);
    var enddate = parseInt(req.body.enddate);

    var db = admin.firestore();
    if (type === "1") {
        if (role === "อาจารย์") {
            db.collection("Appointment").where("teacherID", "==", uID).orderBy("timestamp", "desc").limit(100)
                .get()
                .then((snapshot) => {
                    snapshot.docs.forEach(doc => {
                        allAppointment.push(doc.data());
                    })
                    return true;
                })
                .catch(function (error) {
                    console.log("Error getting documents: ", error);
                }).then(function () {
                    resData.allAppData = allAppointment;
                    res.send(resData);
                    return true;
                }).catch(err => {
                    console.log('Error getting documents', err);
                });
        } else if (role === "ฝ่ายธุรการ") {
            db.collection("Appointment").where("teacher", "==", "ฝ่ายธุรการ").orderBy("timestamp", "desc").limit(100)
                .get()
                .then((snapshot) => {
                    snapshot.docs.forEach(doc => {
                        allAppointment.push(doc.data());
                    })
                    return true;
                })
                .catch(function (error) {
                    console.log("Error getting documents: ", error);
                }).then(function () {
                    resData.allAppData = allAppointment;
                    res.send(resData);
                    return true;
                }).catch(err => {
                    console.log('Error getting documents', err);
                });
        } else if (role === "ฝ่ายบริการ") {
            db.collection("Appointment").where("teacher", "==", "ฝ่ายบริการ").orderBy("timestamp", "desc").limit(100)
                .get()
                .then((snapshot) => {
                    snapshot.docs.forEach(doc => {
                        allAppointment.push(doc.data());
                    })
                    return true;
                })
                .catch(function (error) {
                    console.log("Error getting documents: ", error);
                }).then(function () {
                    resData.allAppData = allAppointment;
                    res.send(resData);
                    return true;
                }).catch(err => {
                    console.log('Error getting documents', err);
                });
        } else {
            res.send("ERROR API");
        }
    } else if (type === "2") {
        if (role === "อาจารย์") {
            db.collection("Appointment").where("teacherID", "==", uID).where("dateMillis", ">=", startdate).where("dateMillis", "<=", enddate)
                .get()
                .then((snapshot) => {
                    snapshot.docs.forEach(doc => {
                        allAppointment.push(doc.data());
                    })
                    return true;
                })
                .catch(function (error) {
                    console.log("Error getting documents: ", error);
                }).then(function () {
                    resData.allAppData = allAppointment;
                    res.send(resData);
                    return true;
                }).catch(err => {
                    console.log('Error getting documents', err);
                });
        } else if (role === "ฝ่ายธุรการ") {
            db.collection("Appointment").where("teacherID", "==", "20").where("dateMillis", ">=", startdate).where("dateMillis", "<=", enddate)
                .get()
                .then((snapshot) => {
                    snapshot.docs.forEach(doc => {
                        allAppointment.push(doc.data());
                    })
                    return true;
                })
                .catch(function (error) {
                    console.log("Error getting documents: ", error);
                }).then(function () {
                    resData.allAppData = allAppointment;
                    res.send(resData);
                    return true;
                }).catch(err => {
                    console.log('Error getting documents', err);
                });
        } else if (role === "ฝ่ายบริการ") {
            db.collection("Appointment").where("teacherID", "==", "30").where("dateMillis", ">=", startdate).where("dateMillis", "<=", enddate)
                .get()
                .then((snapshot) => {
                    snapshot.docs.forEach(doc => {
                        allAppointment.push(doc.data());
                    })
                    return true;
                })
                .catch(function (error) {
                    console.log("Error getting documents: ", error);
                }).then(function () {
                    resData.allAppData = allAppointment;
                    res.send(resData);
                    return true;
                }).catch(err => {
                    console.log('Error getting documents', err);
                });
        } else {
            res.send("ERROR API");
        }
    }
});

appAPI.post('/reportHistory', (req, res) => {
    console.log("API : รายงานการนัดหมาย");
    var resData = {};
    var allAppointment = [];
    var uID = req.body.uID;
    var role = req.body.role;
    var startdate = parseInt(req.body.startdate);
    var enddate = parseInt(req.body.enddate);

    var db = admin.firestore();
    if (role === "อาจารย์") {
        db.collection("Appointment").where("teacherID", "==", uID).where("dateMillis", ">=", startdate).where("dateMillis", "<=", enddate)
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายธุรการ") {
        db.collection("Appointment").where("teacherID", "==", "20").where("dateMillis", ">=", startdate).where("dateMillis", "<=", enddate)
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else if (role === "ฝ่ายบริการ") {
        db.collection("Appointment").where("teacherID", "==", "30").where("dateMillis", ">=", startdate).where("dateMillis", "<=", enddate)
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    var status = doc.data().status;
                    if (status === "กำลังยืมอุปกรณ์" || status === "คืนอุปกรณ์แล้ว(ตรงเวลา)" || status === "คืนอุปกรณ์แล้ว(ล่าช้า)") {
                        allAppointment.push(doc.data());
                    }
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestTimetable', (req, res) => {
    console.log("API : ตารางเวลาว่าง");
    var resData = {};
    var arrayTimetable = [];
    var uID = req.body.uID;
    var role = req.body.role;

    var db = admin.firestore().collection("Timetable");
    if (role === "อาจารย์") {
        db.where("teacher_ID", "==", uID).get().then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
                arrayTimetable.push(doc.data());
            });
            return true;
        }).catch(function (error) {
            console.log("Error getting documents: ", error);
        }).then(function () {
            resData.Timetable = arrayTimetable;
            res.send(resData);
            return true;
        }).catch(function (error) {
            console.log("Error getting documents: ", error);
        })
    } else if (role === "ฝ่ายธุรการ") {
        db.where("teacher_ID", "==", "ฝ่ายธุรการ").get().then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
                arrayTimetable.push(doc.data());
            });
            return true;
        }).catch(function (error) {
            console.log("Error getting documents: ", error);
        }).then(function () {
            resData.Timetable = arrayTimetable;
            res.send(resData);
            return true;
        }).catch(function (error) {
            console.log("Error getting documents: ", error);
        })
    } else if (role === "ฝ่ายบริการ") {
        db.where("teacher_ID", "==", "ฝ่ายบริการ").get().then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
                arrayTimetable.push(doc.data());
            });
            return true;
        }).catch(function (error) {
            console.log("Error getting documents: ", error);
        }).then(function () {
            resData.Timetable = arrayTimetable;
            res.send(resData);
            return true;
        }).catch(function (error) {
            console.log("Error getting documents: ", error);
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/updateTimetable', (req, res) => {
    console.log("API : อัพเดทเวลาว่าง");
    var uID = req.body.uID;
    var role = req.body.role;
    var day = req.body.day;
    var time = req.body.time;
    var status = req.body.status;

    var stringTime = time.substring(4);
    var timeUpdate = parseInt(stringTime);
    var nextHour = timeUpdate + 1;
    var db = admin.firestore();
    if (role === "อาจารย์") {
        var refTeacher = db.collection("Timetable").doc(uID + "_" + day);
        var time_1 = stringTime + ":00 น - " + stringTime + ":15 น";
        var time_2 = stringTime + ":15 น - " + stringTime + ":30 น";
        var time_3 = stringTime + ":30 น - " + stringTime + ":45 น";
        var time_4 = stringTime + ":45 น - " + nextHour.toString() + ":00 น";
        if (status === "free") {
            refTeacher.update(time_1, false, time_2, false, time_3, false, time_4, false).then(function () {
                res.send("Update free time success");
                return true;
            }).catch(function (error) {
                console.log("Error update time : ", error);
            })
        } else if (status === "nofree") {
            refTeacher.update(time_1, true, time_2, true, time_3, true, time_4, true).then(function () {
                res.send("Update no free time success");
                return true;
            }).catch(function (error) {
                console.log("Error update time : ", error);
            })
        }
    } else if (role === "ฝ่ายธุรการ") {
        var refManage = db.collection("Timetable").doc("ฝ่ายธุรการ_" + day);
        var time_5 = stringTime + ":00 น - " + stringTime + ":15 น";
        var time_6 = stringTime + ":15 น - " + stringTime + ":30 น";
        var time_7 = stringTime + ":30 น - " + stringTime + ":45 น";
        var time_8 = stringTime + ":45 น - " + nextHour.toString() + ":00 น";

        if (status === "free") {
            refManage.update(time_5, false, time_6, false, time_7, false, time_8, false).then(function () {
                res.send("Update free time success");
                return true;
            }).catch(function (error) {
                console.log("Error update time : ", error);
            })
        } else if (status === "nofree") {
            refManage.update(time_5, true, time_6, true, time_7, true, time_8, true).then(function () {
                res.send("Update no free time success");
                return true;
            }).catch(function (error) {
                console.log("Error update time : ", error);
            })
        }
    } else if (role === "ฝ่ายบริการ") {
        var refService = db.collection("Timetable").doc("ฝ่ายบริการ_" + day);
        var time_9 = stringTime + ":00 น - " + stringTime + ":15 น";
        var time_10 = stringTime + ":15 น - " + stringTime + ":30 น";
        var time_11 = stringTime + ":30 น - " + stringTime + ":45 น";
        var time_12 = stringTime + ":45 น - " + nextHour.toString() + ":00 น";

        if (status === "free") {
            refService.update(time_9, false, time_10, false, time_11, false, time_12, false).then(function () {
                res.send("Update free time success");
                return true;
            }).catch(function (error) {
                console.log("Error update time : ", error);
            })
        } else if (status === "nofree") {
            refService.update(time_9, true, time_10, true, time_11, true, time_12, true).then(function () {
                res.send("Update no free time success");
                return true;
            }).catch(function (error) {
                console.log("Error update time : ", error);
            })
        }
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/uploadFileStudent', (req, res) => {
    console.log("API : อัพโหลดรายชื่อนักศึกษา");
    var role = req.body.roleAdmin;
    var Data = req.body.allData;
    var advisorID = req.body.advisorID;
    var advisorName = req.body.advisorName;
    var section = req.body.section;

    var db = admin.database();
    var _firestore = admin.firestore();
    if (role === "แอดมิน") {
        var ref = _firestore.collection("Section").doc();
        ref.set({
            id: ref.id,
            section: section,
            active: "1",
        }).then(function () {
            var updateMentor = new Promise((resolve, reject) => {
                var refQuery = db.ref("Users-Teacher");
                refQuery.child(advisorID).once('value', snapshot => {
                    var data = snapshot.val();
                    var _mentor = data.Mentor;
                    if (_mentor !== "-") {
                        _mentor.push(ref.id);
                        refQuery.child(advisorID).update({
                            "Mentor": _mentor,
                        })
                        resolve("OK");
                    } else {
                        var createMentor = [ref.id];
                        refQuery.child(advisorID).update({
                            "Mentor": createMentor,
                        })
                        resolve("OK");
                    }
                })
            });

            var creating = new Promise((resolve, reject) => {
                for (var i = 0; i < Data.length; i++) {
                    var nameStudent = Data[i]["name"];
                    var student_id = Data[i]["id"];
                    var email = Data[i]["email"];
                    var password = Data[i]["pass"];

                    var refUpload = db.ref().child("Users-Student/" + student_id);
                    refUpload.set({
                        Name: nameStudent,
                        Username: student_id,
                        Password: password,
                        Student_ID: student_id,
                        Section_ID: ref.id,
                        AdvisorID: advisorID,
                        AdvisorName: advisorName,
                        Token: "-",
                    })

                    admin.auth().createUser({
                        email: email,
                        password: password,
                    })
                    if (i === Data.length - 1) {
                        resolve("OK");
                    }
                }
            });

            Promise.all([creating, updateMentor]).then(values => {
                if (values[0] === "OK" && values[1] === "OK") {
                    res.send("OK");
                } else {
                    res.send("Error creating");
                }
                return true;
            }).catch(function () {
                console.log("Upload student promise error");
            })
            return true;
        }).catch(function () {
            console.log("Create section error !");
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestAllSection', (req, res) => {
    console.log("API : กลุ่มนักศึกษาทั้งหมด");
    var role = req.body.roleAdmin;

    var resData = {};
    var arraySection = [];
    var arrayID = [];
    if (role === "แอดมิน") {
        var _firestore = admin.firestore().collection("Section");
        _firestore.where("active", "==", "1").get().then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
                var data = doc.data();
                arraySection.push(data["section"]);
                arrayID.push(data["id"]);
            });
            return true;
        }).catch(function () {
            console.log("Getting document error !");
        }).then(function () {
            resData.section = arraySection;
            resData.id = arrayID;
            res.send(resData);
            return true;
        }).catch(function () {
            console.log("Response error !");
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/addMentor', (req, res) => {
    console.log("API : เพิ่มกลุ่มนักศึกษาที่ดูแล");
    var role = req.body.roleAdmin;
    var teacherID = req.body.teacherID;
    var arraySectionID = req.body.sectionID;

    if (role === "แอดมิน") {
        var rtdb = admin.database().ref("Users-Teacher");
        rtdb.child(teacherID).once('value', snapshot => {
            var data = snapshot.val();
            var _mentor = data.Mentor;
            if (_mentor !== "-") {
                for (i = 0; i < arraySectionID.length; i++) {
                    _mentor.push(arraySectionID[i]);
                    if (i === arraySectionID.length - 1) {
                        rtdb.child(teacherID).update({
                            "Mentor": _mentor,
                        }).then(function () {
                            res.send("OK");
                            return true;
                        }).catch(function () {
                            console.log("Add section error !");
                        })
                    }
                }
            } else {
                rtdb.child(teacherID).update({
                    "Mentor": arraySectionID,
                }).then(function () {
                    res.send("OK");
                    return true;
                }).catch(function () {
                    console.log("Add section error !");
                })
            }
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/editMentor', (req, res) => {
    console.log("API : แก้ไขชื่อกลุ่มนักศึกษา");
    var role = req.body.roleAdmin;
    var sectionID = req.body.sectionID;
    var sectionName = req.body.sectionName;

    if (role === "แอดมิน") {
        admin.firestore().collection("Section").doc(sectionID).update({
            section: sectionName,
        }).then(function () {
            res.send("OK");
            return true;
        }).catch(function () {
            console.log("Update section name error !");
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/deleteMentor', (req, res) => {
    console.log("API : ลบกลุ่มนักศึกษาที่ดูแล");
    var role = req.body.roleAdmin;
    var teacherID = req.body.teacherID;
    var sectionID = req.body.sectionID;

    if (role === "แอดมิน") {
        var db = admin.database().ref("Users-Teacher");
        db.child(teacherID).once('value', snapshot => {
            var data = snapshot.val();
            var arrayMentor = data.Mentor;
            var index = arrayMentor.indexOf(sectionID);
            if (index !== -1) {
                arrayMentor.splice(index, 1);
                if (!arrayMentor.length) {
                    arrayMentor = "-";
                    db.child(teacherID).update({
                        "Mentor": arrayMentor,
                    }).then(function () {
                        res.send("OK");
                        return true;
                    }).catch(function () {
                        console.log("Delete mentor error !");
                    })
                } else {
                    db.child(teacherID).update({
                        "Mentor": arrayMentor,
                    }).then(function () {
                        res.send("OK");
                        return true;
                    }).catch(function () {
                        console.log("Delete mentor error !");
                    })
                }
            }
        });
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/checkSection', (req, res) => {
    console.log("API : ตรวจสอบกลุ่มนักศึกษาที่ซ้ำ");
    var role = req.body.roleAdmin;
    var sectionName = req.body.section;

    var resultQuery = [];

    if (role === "แอดมิน") {
        admin.firestore().collection("Section").get().then(function (querySnapshot) {
            querySnapshot.forEach(function (doc) {
                resultQuery.push(doc.data().section);
            });
            return true;
        }).catch(function () {
            console.log("Getting all section error !");
        }).then(function () {
            var index = resultQuery.indexOf(sectionName);
            if (index === -1) {
                res.send("OK");
            } else {
                res.send("Repeat");
            }
            return true;
        }).catch(function () {
            console.log("Response check section error !");
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/uploadTimetable', (req, res) => {
    console.log("API : อัพโหลดตารางสอน");
    var teacherID = req.body.teacherID;
    var role = req.body.role;
    var timetableData = req.body.Data;
    var db = admin.firestore();
    if (role === "แอดมิน") {
        var pathDay = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
        console.log(timetableData);

        var creatingMon = new Promise((resolve, reject) => {
            var refMonTimetable = db.collection("Timetable").doc(teacherID + "_" + pathDay[0]); // จันทร์
            refMonTimetable.set(timetableData[0]).then(function () {
                refMonTimetable.update({
                    id: teacherID + "_" + pathDay[0],
                    teacher_ID: teacherID,
                    day: pathDay[0],
                }).then(function () {
                    db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[0]).set(timetableData[0]).then(function () {
                        db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[0]).update({
                            id: teacherID + "_" + pathDay[0],
                            teacher_ID: teacherID,
                            day: pathDay[0],
                        }).then(function () {
                            resolve("OK");
                            return true;
                        }).catch(function () {
                            console.log("Update backup id error");
                        })
                        return true;
                    }).catch(function () {
                        console.log("Create timetable-backup error");
                    })
                    return true;
                }).catch(function () {
                    console.log("Update id error");
                })
                return true;
            }).catch(function () {
                console.log("Create mon error");
            })
        });

        var creatingTue = new Promise((resolve, reject) => {
            var refTueTimetable = db.collection("Timetable").doc(teacherID + "_" + pathDay[1]); // อังคาร
            refTueTimetable.set(timetableData[1]).then(function () {
                refTueTimetable.update({
                    id: teacherID + "_" + pathDay[1],
                    teacher_ID: teacherID,
                    day: pathDay[1],
                }).then(function () {
                    db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[1]).set(timetableData[1]).then(function () {
                        db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[1]).update({
                            id: teacherID + "_" + pathDay[1],
                            teacher_ID: teacherID,
                            day: pathDay[1],
                        }).then(function () {
                            resolve("OK");
                            return true;
                        }).catch(function () {
                            console.log("Update backup id error");
                        })
                        return true;
                    }).catch(function () {
                        console.log("Create timetable-backup error");
                    })
                    return true;
                }).catch(function () {
                    console.log("Update id error");
                })
                return true;
            }).catch(function () {
                console.log("Create mon error");
            })
        });

        var creatingWed = new Promise((resolve, reject) => {
            var refWedimetable = db.collection("Timetable").doc(teacherID + "_" + pathDay[2]); // พุธ
            refWedimetable.set(timetableData[2]).then(function () {
                refWedimetable.update({
                    id: teacherID + "_" + pathDay[2],
                    teacher_ID: teacherID,
                    day: pathDay[2],
                }).then(function () {
                    db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[2]).set(timetableData[2]).then(function () {
                        db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[2]).update({
                            id: teacherID + "_" + pathDay[2],
                            teacher_ID: teacherID,
                            day: pathDay[2],
                        }).then(function () {
                            resolve("OK");
                            return true;
                        }).catch(function () {
                            console.log("Update backup id error");
                        })
                        return true;
                    }).catch(function () {
                        console.log("Create timetable-backup error");
                    })
                    return true;
                }).catch(function () {
                    console.log("Update id error");
                })
                return true;
            }).catch(function () {
                console.log("Create mon error");
            })
        });

        var creatingThu = new Promise((resolve, reject) => {
            var refThuTimetable = db.collection("Timetable").doc(teacherID + "_" + pathDay[3]); // พฤหัสบดี
            refThuTimetable.set(timetableData[3]).then(function () {
                refThuTimetable.update({
                    id: teacherID + "_" + pathDay[3],
                    teacher_ID: teacherID,
                    day: pathDay[3],
                }).then(function () {
                    db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[3]).set(timetableData[3]).then(function () {
                        db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[3]).update({
                            id: teacherID + "_" + pathDay[3],
                            teacher_ID: teacherID,
                            day: pathDay[3],
                        }).then(function () {
                            resolve("OK");
                            return true;
                        }).catch(function () {
                            console.log("Update backup id error");
                        })
                        return true;
                    }).catch(function () {
                        console.log("Create timetable-backup error");
                    })
                    return true;
                }).catch(function () {
                    console.log("Update id error");
                })
                return true;
            }).catch(function () {
                console.log("Create mon error");
            })
        });

        var creatingFri = new Promise((resolve, reject) => {
            var refFriTimetable = db.collection("Timetable").doc(teacherID + "_" + pathDay[4]); // ศุกร์
            refFriTimetable.set(timetableData[4]).then(function () {
                refFriTimetable.update({
                    id: teacherID + "_" + pathDay[4],
                    teacher_ID: teacherID,
                    day: pathDay[4],
                }).then(function () {
                    db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[4]).set(timetableData[4]).then(function () {
                        db.collection("Timetable-backup").doc(teacherID + "_" + pathDay[4]).update({
                            id: teacherID + "_" + pathDay[4],
                            teacher_ID: teacherID,
                            day: pathDay[4],
                        }).then(function () {
                            resolve("OK");
                            return true;
                        }).catch(function () {
                            console.log("Update backup id error");
                        })
                        return true;
                    }).catch(function () {
                        console.log("Create timetable-backup error");
                    })
                    return true;
                }).catch(function () {
                    console.log("Update id error");
                })
                return true;
            }).catch(function () {
                console.log("Create mon error");
            })
        });

        Promise.all([creatingMon, creatingTue, creatingWed, creatingThu, creatingFri]).then(values => {
            if (values[0] === "OK" && values[1] === "OK" && values[2] === "OK" && values[3] === "OK" && values[4] === "OK") {
                res.send("OK");
            } else {
                res.send("Error sorting");
            }
            return true;
        }).catch(function () {
            console.log("Sorting student promise error");
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestAllTeacher', (req, res) => {
    console.log("API : รายชื่ออาจารย์และเจ้าหน้าที่ทั้งหมด");
    var resData = {};
    var roleAdmin = req.body.roleAdmin;

    var db = admin.database();
    var userRef = db.ref("Users-Teacher");
    if (roleAdmin === "แอดมิน") {
        userRef.once('value', snapshot => {
            var allName = Object.values(snapshot.val());
            resData.teacherName = allName;
            res.send(resData);
        });
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/checkUserData', (req, res) => {
    console.log("API : ตรวจสอบชื่อผู้ใช้"); // เฉพาะอาจารย์และเจ้าหน้าที่เท่านั้น
    var roleAdmin = req.body.role;
    var tolowerusername = req.body.namecheck;
    var id = req.body.id;
    var type = req.body.type;

    if (roleAdmin === "แอดมิน") {
        var db = admin.database();
        var refCheck = db.ref("Users-Teacher");
        var resData = "";

        if (type === "1") {
            refCheck.orderByChild("Username").equalTo(tolowerusername).once('value', snapshot => {
                if (snapshot.val() === null) {
                    resData = "OK";
                    res.send(resData);
                } else {
                    resData = "ERROR ชื่อซ้ำ";
                    res.send(resData);
                }
            })
        } else if (type === "2") {
            refCheck.child(id).once('value', snapshot => {
                var data = snapshot.val();
                if (data.Username === tolowerusername) {
                    res.send("OK");
                } else {
                    refCheck.orderByChild("Username").equalTo(tolowerusername).once('value', snapshot => {
                        if (snapshot.val() === null) {
                            resData = "OK";
                            res.send(resData);
                        } else {
                            resData = "ERROR ชื่อซ้ำ";
                            res.send(resData);
                        }
                    })
                }
            })
        } else {
            res.send("ERROR API");
        }

    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/checkStudentRepeat', (req, res) => {
    console.log("API : ตรวจสอบชื่อนักศึกษา");
    var roleAdmin = req.body.roleAdmin;
    var studentID = req.body.id;

    if (roleAdmin === "แอดมิน") {
        var ref = admin.database().ref("Users-Student");
        ref.orderByChild("Student_ID").equalTo(studentID).once('value', snapshot => {
            if (snapshot.val() === null) {
                resData = "OK";
                res.send(resData);
            } else {
                resData = "ERROR ชื่อซ้ำ";
                res.send(resData);
            }
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/insertUser', (req, res) => {
    console.log("API : เพิ่มผู้ใช้งาน");
    var roleAdmin = req.body.roleAdmin;

    var _type = req.body.type;
    var _nameprefix = req.body.nameprefix;
    var _name = req.body.name;
    var _role = req.body.role;
    var _mentor = req.body.mentor;
    var _username = req.body.username;
    var _password = req.body.password;

    var _advisorName = req.body.advisorName;
    var _advisorID = req.body.advisorID;
    var _section = req.body.sectionID;

    var email = _username + '@cpe.ac.th';

    if (roleAdmin === "แอดมิน") {
        var db = admin.database();
        if (_type === "1") {
            var refInsert = db.ref().child("Users-Teacher").push();
            refInsert.set({
                uID: refInsert.key,
                Name_prefix: _nameprefix,
                Name: _name,
                Role: _role,
                Username: _username,
                Password: _password,
                Mentor: _mentor,
                Notification: "on",
                Token: "-",
            })

            admin.auth().createUser({
                email: email,
                password: _password,
            })
            res.send("OK");
        } else if (_type === "2") {
            var refInsertStudent = db.ref().child("Users-Student/" + _username);
            refInsertStudent.set({
                AdvisorID: _advisorID,
                AdvisorName: _advisorName,
                Name: _name,
                Username: _username,
                Password: _password,
                Student_ID: _username,
                Section_ID: _section,
                Token: "-",
            })

            admin.auth().createUser({
                email: email,
                password: _password,
            })
            res.send("OK");
        } else {
            res.send("ERROR TYPE");
        }
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/searchUser', (req, res) => {
    console.log("API : ข้อมูลผู้ใช้งาน");
    var roleAdmin = req.body.roleAdmin;
    var _name = req.body.name;
    var _type = req.body.type;

    if (roleAdmin === "แอดมิน") {
        var data = {};
        var db = admin.database();
        if (_type === "1") {
            var refTeacher = db.ref().child("Users-Teacher").child(_name);
            refTeacher.once('value', function (snapshot) {
                data = snapshot.val();
                res.send(data);
            })
        } else if (_type === "2") {
            var refStudent = db.ref("Users-Student").child(_name);
            refStudent.once('value', function (snapshot) {
                data = snapshot.val();
                res.send(data);
            })
        } else {
            res.send("ERROR API");
        }
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/deleteUser', (req, res) => {
    console.log("API : ลบผู้ใช้งาน");
    var roleAdmin = req.body.role;
    var id = req.body.id;
    var type = req.body.type;

    if (roleAdmin === "แอดมิน") {
        var db = admin.database();
        if (type === "1") {
            var refTeacher = db.ref().child("Users-Teacher");
            refTeacher.child(id).once('value', function (snapshot) {
                var data = snapshot.val();
                var usersDelete = db.ref().child("Users-Delete/" + id);
                usersDelete.set({
                    Name_prefix: data.Name_prefix,
                    Name: data.Name,
                    Role: data.Role,
                    Mentor: data.Mentor,
                    Username: data.Username,
                    Password: data.Password,
                    uID: data.uID,
                    Token: data.Token,
                    Delete_date: moment().format("DD/MM/YYYY"),
                }).then(function () {
                    console.log("Set users-delete finished")
                    var email = data.Username + "@cpe.ac.th";
                    admin.auth().getUserByEmail(email)
                        .then(function (userRecord) {
                            var uID = userRecord["uid"];
                            admin.auth().deleteUser(uID)
                                .then(function () {
                                    console.log('Successfully deleted user');
                                    refTeacher.child(id).remove().then(function () {
                                        if (data.Role === "อาจารย์") {
                                            var db = admin.firestore();
                                            db.collection("Timetable").where("teacher_ID", "==", id)
                                                .get()
                                                .then(function (querySnapshot) {
                                                    querySnapshot.forEach(function (doc) {
                                                        doc.ref.delete();
                                                    });
                                                    return true;
                                                })
                                                .catch(function (error) {
                                                    console.log("Error getting documents: ", error);
                                                }).then(function () {
                                                    db.collection("Timetable-backup").where("teacher_ID", "==", id)
                                                        .get()
                                                        .then(function (querySnapshot) {
                                                            querySnapshot.forEach(function (doc) {
                                                                doc.ref.delete();
                                                            });
                                                            return true;
                                                        })
                                                        .catch(function (error) {
                                                            console.log("Error getting documents: ", error);
                                                        }).then(function () {
                                                            res.send("OK");
                                                            return true;
                                                        }).catch(function () {
                                                            console.log("Timetable-backup delete error");
                                                        })
                                                    return true;
                                                }).catch(function () {
                                                    console.log("Timetable delete error");
                                                })
                                        } else {
                                            res.send("OK");
                                        }
                                        return true;
                                    }).catch(function () {
                                        console.log("Remove from Users error");
                                    })
                                    return true;
                                })
                                .catch(function (error) {
                                    console.log('Error deleting user:', error);
                                });
                            return true;
                        })
                        .catch(function (error) {
                            console.log('Error fetching user data:', error);
                        });
                    return true;
                }).catch(function () {
                    console.log("Copy user delete error");
                })
            })
        } else if (type === "2") {
            var refStudent = db.ref().child("Users-Student");
            refStudent.child(id).on('value', function (snapshot) {
                if (snapshot.val()) {
                    var data = snapshot.val();

                    var studentDelete = db.ref().child("Users-Delete/" + id);
                    studentDelete.set({
                        AdvisorID: data.AdvisorID,
                        AdvisorName: data.AdvisorName,
                        Name: data.Name,
                        Username: data.Username,
                        Password: data.Password,
                        Section_ID: data.Section_ID,
                        Student_ID: data.Student_ID,
                        Delete_date: moment().format("DD/MM/YYYY"),
                    }).then(function () {
                        var email = data.Username + "@cpe.ac.th";
                        admin.auth().getUserByEmail(email)
                            .then(function (userRecord) {
                                var uID = userRecord["uid"];
                                admin.auth().deleteUser(uID)
                                    .then(function () {
                                        console.log('Successfully deleted user');
                                        refStudent.child(id).remove().then(function () {
                                            res.send("OK");
                                            return true;
                                        }).catch(function () {
                                            res.send("OK");
                                            console.log("Remove from Users error");
                                        })
                                        return true;
                                    })
                                    .catch(function (error) {
                                        console.log('Error deleting user:', error);
                                    });
                                return true;
                            })
                            .catch(function (error) {
                                console.log('Error fetching user data:', error);
                            });
                        return true;
                    }).catch(function () {
                        console.log("Copy user delete error");
                    })
                }
            })
        } else {
            res.send("ERROR API");
        }
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestStudentAppointment', (req, res) => {
    console.log("API : รายการนัดหมายของนักศึกษา");
    var resData = {};
    var allAppointment = [];
    var student_ID = req.body.id;
    var role = req.body.role;
    if (role === "แอดมิน") {
        var db = admin.firestore();
        db.collection("Appointment").where("student_ID", "==", student_ID).orderBy("timestamp", "desc").limit(100)
            .get()
            .then((snapshot) => {
                snapshot.docs.forEach(doc => {
                    allAppointment.push(doc.data());
                })
                return true;
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            }).then(function () {
                resData.allAppData = allAppointment;
                res.send(resData);
                return true;
            }).catch(err => {
                console.log('Error getting documents', err);
            });
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/updateUserData', (req, res) => {
    console.log("API : อัพเดทข้อมูลผู้ใช้งาน");
    var roleAdmin = req.body.roleAdmin;

    var _typeChange = req.body.type;
    var _name_prefix = req.body.name_prefix;
    var _name = req.body.name;
    var _role = req.body.role;
    var _username = req.body.username;
    var _password_new = req.body.password_new;
    var _password_old = req.body.password_old;
    var _id = req.body.id;

    var newEmail = _username + '@cpe.ac.th';
    if (roleAdmin === "แอดมิน") {
        var db = admin.database();
        var userRef = db.ref("Users-Teacher");
        if (_role === "NULL") {
            userRef = db.ref("Users-Student");
        }
        if (_typeChange === "1") {
            userRef.child(_id).once('value', function (snapshot) {
                var data = snapshot.val();
                var oldEmail = data.Username + '@cpe.ac.th';
                admin.auth().getUserByEmail(oldEmail)
                    .then(function (userRecord) {
                        var uID = userRecord["uid"];
                        admin.auth().updateUser(uID, {
                            email: newEmail,
                            password: data.Password,
                        }).then(function (userRecord) {
                            console.log('Successfully updated user');
                            userRef.child(_id).update({
                                Name_prefix: _name_prefix,
                                Name: _name,
                                Username: _username,
                            }).then(function () {
                                res.send("OK");
                                return true;
                            }).catch(function () {
                                console.log("Update error !");
                            })
                            return true;
                        })
                            .catch(function (error) {
                                console.log('Error updating user:', error);
                            });
                        return true;
                    })
                    .catch(function (error) {
                        console.log('Error fetching user data:', error);
                    });
            })
        } else if (_typeChange === "2") {
            userRef.child(_id).once('value', function (snapshot) {
                var data = snapshot.val();
                var oldEmail = data.Username + '@cpe.ac.th';
                if (_password_old === data.Password) {
                    admin.auth().getUserByEmail(oldEmail)
                        .then(function (userRecord) {
                            var uID = userRecord["uid"];
                            admin.auth().updateUser(uID, {
                                email: oldEmail,
                                password: _password_new,
                            })
                                .then(function (userRecord) {
                                    console.log('Successfully updated user');
                                    userRef.child(_id).update({
                                        "Password": _password_new
                                    }).then(function () {
                                        res.send("OK");
                                        return true;
                                    }).catch(function () {
                                        console.log("Update password db error !");
                                    })
                                    return true;
                                })
                                .catch(function (error) {
                                    console.log('Error updating user:', error);
                                });
                            return true;
                        })
                        .catch(function (error) {
                            console.log('Error fetching user data:', error);
                        });
                } else {
                    res.send("PASSWORDBAD");
                }
            })
        } else {
            res.send("ERROR TYPE");
        }
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/requestStudentList', (req, res) => {
    console.log("API : รายชื่อนักศึกษา");
    var role = req.body.role;
    var uID = req.body.uID;
    var dataName = req.body.name;
    var dataStudentID = req.body.studentID;
    var dataSectionID = req.body.section;
    var resData = {};

    if (role === "อาจารย์") {
        var _allSectionID = [];
        var _allSectionName = [];
        var _allData;
        var _all = new Promise((resolve, reject) => {
            admin.firestore().collection("Section").get().then(function (querySnapshot) {
                querySnapshot.forEach(function (doc) {
                    _allSectionID.push(doc.data().id);
                    _allSectionName.push(doc.data().section);
                });
                return true;
            }).catch(function () {
                console.log("Getting all section error !");
            }).then(function () {
                admin.database().ref("Users-Student").once("value", function (snapshot) {
                    if (snapshot.val()) {
                        _allData = Object.values(snapshot.val());
                        resolve("OK");
                    } else {
                        resolve("NODATA");
                    }
                })
                return true;
            }).catch(function () {
                console.log("Getting all student error !");
            })
        });

        Promise.all([_all]).then(values => {
            if (values[0] === "OK") {
                var resultTeacher = [];
                var resultSectionName = [];
                admin.database().ref("Users-Teacher").child(uID).once("value", function (snapshot) {
                    var _teacherMentor = snapshot.val().Mentor;
                    if (_teacherMentor.length) {
                        for (var i = 0; i < _teacherMentor.length; i++) {

                            var _index = _allSectionID.indexOf(_teacherMentor[i]);
                            var _sectionName = _allSectionName[_index]

                            for (var j = 0; j < _allData.length; j++) {
                                if (_teacherMentor[i] === _allData[j]["Section_ID"]) {
                                    resultTeacher.push(_allData[j]);
                                    resultSectionName.push(_sectionName);
                                }

                                if (i === _teacherMentor.length - 1 && j === _allData.length - 1) {
                                    resData.allStudent = resultTeacher;
                                    resData.allSection = resultSectionName;
                                    res.send(resData);
                                }
                            }
                        }
                    } else {
                        res.send(resData);
                    }
                })
            } else {
                res.send(resData);
            }
            return true;
        }).catch(function () {
            console.log("Getting student promise error");
        })
    } else if (role === "ฝ่ายธุรการ") {
        var array;
        var result_1 = [];
        var result_2 = [];
        var result_3 = [];
        var result_section_name = [];
        admin.database().ref("Users-Student").once("value", function (snapshot) {
            array = Object.values(snapshot.val())
            var sort1 = new Promise((resolve, reject) => {
                for (var s_1 = 0; s_1 < array.length; s_1++) {
                    if (array[s_1]["Name"].includes(dataName)) {
                        result_1.push(array[s_1]);
                    }

                    if (s_1 === array.length - 1) {
                        if (!result_1.length) {
                            result_1 = array;
                            resolve("OK");
                        } else {
                            resolve("OK");
                        }
                    }
                }
            });
            var sort2 = new Promise((resolve, reject) => {
                for (var s_2 = 0; s_2 < result_1.length; s_2++) {
                    if (result_1[s_2]["Student_ID"].includes(dataStudentID)) {
                        result_2.push(result_1[s_2]);
                    }

                    if (s_2 === result_1.length - 1) {
                        if (!result_2.length) {
                            result_2 = result_1;
                            resolve("OK");
                        } else {
                            resolve("OK");
                        }
                    }
                }
            });
            var sort3 = new Promise((resolve, reject) => {
                if (dataSectionID !== "-") {
                    for (var s_3 = 0; s_3 < result_2.length; s_3++) {
                        if (result_2[s_3]["Section_ID"] === dataSectionID) {
                            result_3.push(result_2[s_3]);
                        }

                        if (s_3 === result_2.length - 1) {
                            if (!result_3.length) {
                                result_3 = result_2;
                                resolve("OK");
                            } else {
                                resolve("OK");
                            }
                        }
                    }
                } else {
                    result_3 = result_2;
                    resolve("OK");
                }
            });

            var sort4 = new Promise((resolve, reject) => {
                var __allSectionID = [];
                var __allSectionName = [];
                admin.firestore().collection("Section").get().then(function (querySnapshot) {
                    querySnapshot.forEach(function (doc) {
                        __allSectionID.push(doc.data().id);
                        __allSectionName.push(doc.data().section);
                    });
                    return true;
                }).catch(function () {
                    console.log("Getting all section error !");
                }).then(function () {
                    for (var s_4 = 0; s_4 < result_3.length; s_4++) {
                        var index_ = __allSectionID.indexOf(result_3[s_4]["Section_ID"]);
                        var sectionName_ = __allSectionName[index_];
                        result_section_name.push(sectionName_);

                        if (s_4 === result_3.length - 1) {
                            resolve("OK");
                        }
                    }
                    return true;
                }).catch(function () {
                    console.log("Set section name error !");
                })
            });

            Promise.all([sort1, sort2, sort3, sort4]).then(values => {
                if (values[0] === "OK" && values[1] === "OK" && values[2] === "OK" && values[3] === "OK") {
                    resData.allStudent = result_3;
                    resData.allSection = result_section_name;
                    res.send(resData);
                } else {
                    res.send("Error sorting");
                }
                return true;
            }).catch(function () {
                console.log("Sorting student promise error");
            })
        })
    } else {
        res.send("ERROR API");
    }
});

appAPI.post('/createMessage', (req, res) => {
    console.log("API : สร้างการนัดหมาย");
    var role = req.body.role;
    var data = req.body.data;

    if (role === "อาจารย์" || role === "ฝ่ายธุรการ") {
        var ref = admin.firestore().collection("Message").doc();
        ref.set({
            note_ID: ref.id,
            title: data["Title"],
            news: data["News"],
            teacherID: data["TeacherID"],
            teacherName: data["TeacherName"],
            teacherRole: role,
            timestamp: parseInt(data["Timestamp"]),
            startdate: data["Startdate"],
            enddate: data["Enddate"],
            startdateMillis: parseInt(data["StartdateMillis"]),
            enddateMillis: parseInt(data["EnddateMillis"]),
            status: "1",
            student_ID: data["Student_ID"],
        }).then(function () {
            res.send("OK");
            return true;
        }).catch(function () {
            console.log("Create message error");
        })
    } else {
        res.send("ERROR API");
    }
});

exports.API = functions.https.onRequest(appAPI);