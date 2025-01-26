import mqtt from 'mqtt';

const MQTT_CONFIG = {
  hostname: 'broker.flowfuse.cloud',
  port: 8884, // Using secure WebSocket port
  protocol: 'wss', // Using secure WebSocket protocol
  username: 'geotabmgmttool@OPG6kKbLX2',
  password: '345hshfdhg345ghfj58gh',
  clientId: 'geotabmgmttool@OPG6kKbLX2',
  protocolVersion: 5
};

const MQTT_TOPIC = 'geotabmgmt/events';

let mqttClient: mqtt.MqttClient | null = null;

export function initializeMqttClient() {
  if (mqttClient) return mqttClient;

  const url = `${MQTT_CONFIG.protocol}://${MQTT_CONFIG.hostname}:${MQTT_CONFIG.port}/mqtt`;
  
  mqttClient = mqtt.connect(url, {
    clientId: MQTT_CONFIG.clientId,
    username: MQTT_CONFIG.username,
    password: MQTT_CONFIG.password,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    keepalive: 60,
    protocolVersion: 5
  });

  mqttClient.on('connect', () => {
    console.log('MQTT client connected');
    mqttClient?.subscribe(MQTT_TOPIC, (err) => {
      if (err) {
        console.error('MQTT subscription error:', err);
      } else {
        console.log('Subscribed to:', MQTT_TOPIC);
      }
    });
  });

  mqttClient.on('error', (error) => {
    console.error('MQTT connection error:', error);
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      console.log('Received message:', topic, payload);
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  });

  mqttClient.on('close', () => {
    console.log('MQTT connection closed');
  });

  mqttClient.on('offline', () => {
    console.log('MQTT client offline');
  });

  mqttClient.on('reconnect', () => {
    console.log('MQTT client reconnecting');
  });

  return mqttClient;
}

export function sendMqttMessage(message: {
  email: string;
  operation: 'add' | 'delete';
  macAddress: string;
  geotabSerialNumber?: string;
  timestamp?: string;
}) {
  if (!mqttClient) {
    mqttClient = initializeMqttClient();
  }

  const payload = JSON.stringify({
    ...message,
    timestamp: message.timestamp || new Date().toISOString()
  });

  mqttClient.publish(MQTT_TOPIC, payload, { qos: 1, retain: false }, (error) => {
    if (error) {
      console.error('MQTT publish error:', error);
    } else {
      console.log('Message published successfully');
    }
  });
}

export function createPairMessage(email: string, macAddress: string, geotabSerialNumber: string) {
  return sendMqttMessage({
    email,
    operation: 'add',
    macAddress,
    geotabSerialNumber
  });
}

export function createUnpairMessage(email: string, macAddress: string) {
  return sendMqttMessage({
    email,
    operation: 'delete',
    macAddress
  });
}