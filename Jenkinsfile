#!groovy​

pipeline {
    agent {
        kubernetes {
              label 'node'
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:lts
    tty: true
    command:
      - cat
"""
        }
    }

    options {
        timestamps()
        skipStagesAfterUnstable()
    }

    environment {
        // https://stackoverflow.com/a/43264045
        HOME="."
    }

    stages {
        stage('Build') {
            steps {
                container("node") {
                    dir('dev') {
                        sh '''#!/usr/bin/env bash
                            # Test compilation to catch any errors
                            npm run vscode:prepublish

                            # Package for prod
                            npm i vsce
                            npx vsce package

                            # rename to have datetime for clarity + prevent collisions
                            export artifact_name=$(basename *.vsix)
                            mv -v $artifact_name ${artifact_name/.vsix/_$(date +'%F-%H%M').vsix}
                        '''

                        // Note there must be exactly one .vsix
                        stash includes: '*.vsix', name: 'deployables'
                    }
                }
            }
        }
        stage ('Deploy') {
            agent any
            steps {
                sshagent (['projects-storage.eclipse.org-bot-ssh']) {
                    unstash 'deployables'
                    
                    println("Deploying codewind-openapi-vscode to downoad area...")

                    sh '''#!/usr/bin/env bash
                        export REPO_NAME="codewind-openapi-vscode"
                        export OUTPUT_NAME="codewind-openapi-tools"
                        export DOWNLOAD_AREA_URL="https://download.eclipse.org/codewind/$REPO_NAME"
                        export LATEST_DIR="latest"
                        export BUILD_INFO="build_info.properties"
                        export sshHost="genie.codewind@projects-storage.eclipse.org"
                        export deployParentDir="/home/data/httpd/download.eclipse.org/codewind/$REPO_NAME"
                        
                        if [ -z $CHANGE_ID ]; then
                            UPLOAD_DIR="$GIT_BRANCH/$BUILD_ID"
                            BUILD_URL="$DOWNLOAD_AREA_URL/$UPLOAD_DIR"

                            ssh $sshHost rm -rf $deployParentDir/$GIT_BRANCH/$LATEST_DIR
                            ssh $sshHost mkdir -p $deployParentDir/$GIT_BRANCH/$LATEST_DIR

                            cp $OUTPUT_NAME-*.vsix $OUTPUT_NAME.vsix
                            scp $OUTPUT_NAME.vsix $sshHost:$deployParentDir/$GIT_BRANCH/$LATEST_DIR/$OUTPUT_NAME.vsix

                            echo "# Build date: $(date +%F-%T)" >> $BUILD_INFO
                            echo "build_info.url=$BUILD_URL" >> $BUILD_INFO
                            SHA1=$(sha1sum ${OUTPUT_NAME}.vsix | cut -d ' ' -f 1)
                            echo "build_info.SHA-1=${SHA1}" >> $BUILD_INFO

                            scp $BUILD_INFO $sshHost:$deployParentDir/$GIT_BRANCH/$LATEST_DIR/$BUILD_INFO
                            rm $BUILD_INFO
                            rm $OUTPUT_NAME.vsix
                        else
                            UPLOAD_DIR="pr/$CHANGE_ID/$BUILD_ID"
                        fi

                        ssh $sshHost rm -rf $deployParentDir/${UPLOAD_DIR}
                        ssh $sshHost mkdir -p $deployParentDir/${UPLOAD_DIR}
                        scp -r *.vsix $sshHost:$deployParentDir/${UPLOAD_DIR}

                        echo "Uploaded to https://download.eclipse.org${deployParentDir##*download.eclipse.org}"
                    '''
                }
            }
        }
    }
}
