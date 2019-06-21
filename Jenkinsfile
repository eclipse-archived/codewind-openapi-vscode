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
                            export artifact_name=$(basename *.vsix)
                            # rename to have datetime for clarity + prevent collisions
                            mv -v $artifact_name ${artifact_name/.vsix/_$(date +'%F-%H%M').vsix}
                            export artifact_name=$(basename *.vsix)
                        '''

                        // Update the last_build file
                        sh '''#!/usr/bin/env bash
                            commit_info="$(git log -3 --pretty='%h by %an - %s\n')"
                            printf "Last build #${BUILD_ID}: $artifact_name from $GIT_BRANCH:\n\n$commit_info" > last_build.txt
                        '''

                        // Note there must be exactly one .vsix
                        stash includes: 'last_build.txt, *.vsix', name: 'deployables'
                    }
                }
            }
        }
        stage ("Upload") {
            agent any
            steps {
                sshagent (['projects-storage.eclipse.org-bot-ssh']) {
                    unstash 'deployables'
                    sh '''
                        ls -lA
                        export sshHost="genie.codewind@projects-storage.eclipse.org"
                        export deployDir="/home/data/httpd/download.eclipse.org/codewind/codewind-openapi-vscode/${GIT_BRANCH}/${BUILD_ID}"
                        ssh $sshHost mkdir -p $deployDir
                        scp *.vsix last_build.txt ${sshHost}:${deployDir}
                    '''
                }
            }
        }
    }
}
