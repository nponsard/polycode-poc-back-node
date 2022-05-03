import { randomUUID } from 'crypto';
import { Email } from 'src/entities/email.entity';
import { User } from 'src/entities/user.entity';
import * as axios from 'axios';
import { frontendUrl } from 'src/common';

const sendiblueKey = process.env.SENDIBLUE_KEY;
const senderEmail = process.env.SENDER_EMAIL;

export const MailExpiration = 60 * 60 * 15; // 15 minutes
export const MailCoolDown = 60 * 60 * 5; // 5 minutes

export async function sendValidationMail(user: User) {
  const lastEmail = await Email.findOne({
    where: {
      user: {
        id: user.id,
      },
    },
    order: {
      createdAt: 'DESC',
    },
  });

  if (lastEmail && lastEmail.createdAt.getTime() + MailCoolDown > Date.now()) {
    throw new Error('Mail cooldown');
  }

  // Delete old codes

  try {
    Email.delete({
      user: {
        id: user.id,
      },
    });
  } catch (e) {
    console.log(e);
  }

  const code = randomUUID();
  const email = user.email;

  const emailEntity = new Email();
  emailEntity.code = code;
  emailEntity.user = user;

  await emailEntity.save();

  const url = `${frontendUrl}/auth/validate/${code}`;
  try {
    await sendMail(
      email,
      'Polycode : validate your account',
      /*html*/
      `<p>Hello and welcome to polycode ${user.username} !</p>
      <p>Please click on the following link to validate your account :
      <a href="${url}">${url}</a>
      </p>`,
    );
  } catch (e) {
    console.log(e);
  }
}

function sendMail(email: string, subject: string, content: string) {
  return axios.default.post(
    'https://api.sendinblue.com/v3/smtp/email',
    {
      sender: {
        name: 'noreply',
        email: senderEmail,
      },
      to: [
        {
          email,
          name: email,
        },
      ],
      subject,
      htmlContent: content,
    },
    {
      headers: { 'api-key': sendiblueKey },
    },
  );
}
