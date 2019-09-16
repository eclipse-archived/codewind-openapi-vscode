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
        stage ("Upload") {
            // This when clause disables PR build uploads; you may comment this out if you want your build uploaded.
            when {
                beforeAgent true
                not {
                    changeRequest()
                }
            }

            agent any
            steps {
                sshagent (['projects-storage.eclipse.org-bot-ssh']) {
                    unstash 'deployables'
                    
                    sh '''#!/usr/bin/env bash
                        export REPO_NAME="codewind-openapi-vscode"
                        export OUTPUT_NAME="codewind-openapi-tools"
                        export DOWNLOAD_AREA_URL="https://download.eclipse.org/codewind/$REPO_NAME"
                        export LATEST_DIR="latest"
                        export BUILD_INFO="build_info.properties"
                        export sshHost="genie.codewind@projects-storage.eclipse.org"
                        export deployParentDir="/home/data/httpd/download.eclipse.org/codewind/$REPO_NAME"
                        
                        UPLOAD_DIR="$GIT_BRANCH/$BUILD_ID"
                        BUILD_URL="$DOWNLOAD_AREA_URL/$UPLOAD_DIR"

                        ssh $sshHost rm -rf $deployParentDir/$GIT_BRANCH/$LATEST_DIR
                        ssh $sshHost mkdir -p $deployParentDir/$GIT_BRANCH/$LATEST_DIR

                        cp $OUTPUT_NAME-*.vsix $OUTPUT_NAME.vsix
                        scp $OUTPUT_NAME.vsix $sshHost:$deployParentDir/$GIT_BRANCH/$LATEST_DIR/$OUTPUT_NAME.vsix

                        echo "# Build date: $(date +%F-%T)" >> $OUTPUT_DIR/$BUILD_INFO
                        echo "build_info.url=$BUILD_URL" >> $BUILD_INFO
                        SHA1=$(sha1sum ${OUTPUT_NAME}.vsix | cut -d ' ' -f 1)
                        echo "build_info.SHA-1=${SHA1}" >> $BUILD_INFO

                        scp $BUILD_INFO $sshHost:$deployParentDir/$GIT_BRANCH/$LATEST_DIR/$BUILD_INFO
                        rm $BUILD_INFO
                        rm $OUTPUT_NAME.vsix
                        
                        export deployDir="$deployParentDir/$UPLOAD_DIR"

                        printf "Uploading files:\n$(ls -l *.vsix)\n"

                        ssh $sshHost mkdir -p $deployDir
                        scp *.vsix $sshHost:$deployDir
                        echo "Uploaded to https://download.eclipse.org${deployDir##*download.eclipse.org}"
                    '''
                }
            }
        }
    }
}
