#FROM ubuntu
#RUN apt-get update
#RUN apt-get install -y git nodejs npm nodejs-legacy
#RUN git clone git://github.com/DuoSoftware/DVP-SocialConnector.git /usr/local/src/socialconnector
#RUN cd /usr/local/src/socialconnector; npm install
#CMD ["nodejs", "/usr/local/src/socialconnector/app.js"]

#EXPOSE 8872

FROM node:5.10.0
RUN git clone git://github.com/DuoSoftware/DVP-SocialConnector.git /usr/local/src/socialconnector
RUN cd /usr/local/src/socialconnector;
WORKDIR /usr/local/src/socialconnector
RUN npm install
EXPOSE 8878
CMD [ "node", "/usr/local/src/socialconnector/app.js" ]