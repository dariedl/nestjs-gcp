# Google Login

Need to run gcloud auth application-default login as first step

Then build and push image to gcloud with gcloud builds submit


# CDKTF

- there is no cdktf tool to fix a broken state, not sure if normal terraform can be used here instead
- cdktf diff shows less information than terraform plan

- dependsOn property which was imported has mismatching types, need to figure out if this is a problem that can be ignored or if the dependsOn is even working

- at startup cloudrun would fail, because there are no postgresql tables created. Also the image needs to be deployed after the infrastructure is there but before cloudrun is deployed. Would need to decouple the cloudrun from the database

- cdktf convert for cloudservice returned an array at annotation and limits, where an object of keys was expected.

- for instances created with new from terraform you can access the variables but they are placeholder strings (for example sqlUser.name return TokenXXX instead of the actual name). So
you cannot log it or use it, but for cloudformation templates they are later replaced in the cdktf.json with the actual values