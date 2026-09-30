import { FunctionDeclaration, Type } from '@google/genai';

export const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: 'openWebsite',
    description: 'Opens a web URL in the browser. Requires confirmation if external.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: 'The destination website URL (e.g. https://example.com)',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'googleSearch',
    description: 'Searches Google for real-time information, questions, or facts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'The search query to look up on Google',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'openYouTube',
    description: 'Searches and opens a video or topic on YouTube.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        searchQuery: {
          type: Type.STRING,
          description: 'The query to search for on YouTube',
        },
        videoId: {
          type: Type.STRING,
          description: 'Optional specific YouTube video ID if known',
        },
      },
      required: ['searchQuery'],
    },
  },
  {
    name: 'playMusic',
    description: 'Plays a requested song or music track through the assistant music player or streaming service.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        songTitle: {
          type: Type.STRING,
          description: 'The name or title of the song',
        },
        artist: {
          type: Type.STRING,
          description: 'Optional name of the artist or band',
        },
      },
      required: ['songTitle'],
    },
  },
  {
    name: 'openApp',
    description: 'Launches an installed mobile application or deep link (e.g. Spotify, Instagram, Calculator, Settings).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: {
          type: Type.STRING,
          description: 'The name of the app to launch (e.g. WhatsApp, Camera, Maps, Spotify)',
        },
      },
      required: ['appName'],
    },
  },
  {
    name: 'sendWhatsAppMessage',
    description: 'Sends a WhatsApp chat message to a contact or phone number. Requires explicit user permission.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        phoneNumber: {
          type: Type.STRING,
          description: 'The international phone number or contact identifier',
        },
        message: {
          type: Type.STRING,
          description: 'The message content to send',
        },
      },
      required: ['phoneNumber', 'message'],
    },
  },
  {
    name: 'makePhoneCall',
    description: 'Places a phone call to a phone number or contact name. Sensitive action requiring user approval.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        phoneNumber: {
          type: Type.STRING,
          description: 'The phone number to dial',
        },
        contactName: {
          type: Type.STRING,
          description: 'Optional friendly name of the contact being called',
        },
      },
      required: ['phoneNumber'],
    },
  },
  {
    name: 'sendSMS',
    description: 'Sends a text SMS message to a phone number. Sensitive action requiring user approval.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        phoneNumber: {
          type: Type.STRING,
          description: 'The phone number to send the SMS to',
        },
        message: {
          type: Type.STRING,
          description: 'The text message body to send',
        },
      },
      required: ['phoneNumber', 'message'],
    },
  },
  {
    name: 'openCamera',
    description: 'Opens the device camera viewfinder. Requires camera permission.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mode: {
          type: Type.STRING,
          description: 'Camera mode: "photo", "video", "selfie", or "rear"',
        },
      },
    },
  },
  {
    name: 'openGallery',
    description: 'Opens the photo gallery or storage view to inspect photos and media.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'openMaps',
    description: 'Opens navigation and map directions for a destination or location query.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        destination: {
          type: Type.STRING,
          description: 'The destination address, landmark, or coordinates',
        },
        query: {
          type: Type.STRING,
          description: 'Optional search query like "cafes nearby" or "gas station"',
        },
      },
    },
  },
  {
    name: 'setAlarm',
    description: 'Schedules an alarm for a specific time.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        time: {
          type: Type.STRING,
          description: 'The alarm time (e.g. "07:30 AM", "14:00", "in 15 minutes")',
        },
        label: {
          type: Type.STRING,
          description: 'Optional descriptive label for the alarm',
        },
      },
      required: ['time'],
    },
  },
  {
    name: 'createReminder',
    description: 'Creates a reminder item with a title and due time.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'What the user needs to be reminded about',
        },
        dueTime: {
          type: Type.STRING,
          description: 'When the reminder is due (e.g. "5:00 PM today", "tomorrow morning")',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'openContacts',
    description: 'Opens and searches the device contacts list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Optional contact name to search for',
        },
      },
    },
  },
  {
    name: 'shareContent',
    description: 'Triggers the mobile share sheet to share text, a URL, or media.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Title of the content to share',
        },
        text: {
          type: Type.STRING,
          description: 'Text message or content to share',
        },
        url: {
          type: Type.STRING,
          description: 'Optional URL to share',
        },
      },
    },
  },
];
