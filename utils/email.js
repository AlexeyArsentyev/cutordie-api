const nodemailer = require("nodemailer");

const sendEmail = async options => {
  console.log(
    process.env.EMAIL_HOST,
    process.env.EMAIL_PORT,
    process.env.EMAIL_USERNAME,
    process.env.EMAIL_PASSWORD,
    options.email
  );
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }

    // host: "smtp.gmail.com",
    // port: 587,
    // secure: false,
    // auth: {
    //   user: process.env.EMAIL_USERNAME,
    //   pass: process.env.EMAIL_PASSWORD
    // }
  });

  const mailOptions = {
    from: "cutordieofficial@gmail.com",
    to: options.email,

    // to: "bvr2006bvr2006@gmail.com",
    // to: "alexey10.arsentyev@gmail.com",

    subject: options.subject,
    text: options.message
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
